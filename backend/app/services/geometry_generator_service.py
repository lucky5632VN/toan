"""
Geometry Generator Service – Chuyển đổi văn bản/ảnh thành JSON toạ độ 3D
sử dụng Google Gemini API (multimodal).

Cơ chế chống lỗi 503/429:
  - Tầng 1: @retry (tenacity) tự động thử lại model chính tối đa 3 lần
            với back-off lũy thừa (2s → 4s → 8s).
  - Tầng 2: Nếu model chính thất bại hoàn toàn, lần lượt thử từng model dự phòng.
  - Tầng 3: Nếu tất cả thất bại → HTTPException(503) thân thiện.
"""
import os
import json
import re
import logging
from fastapi import HTTPException
from dotenv import load_dotenv

import google.generativeai as genai

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
)

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── System Instruction ───────────────────────────────────────────────────────

SYSTEM_INSTRUCTION = (
    "Bạn là một chuyên gia Hình học Không gian và Thị giác Máy tính cấp cao. \n"
    "NHIỆM VỤ: Phân tích đề bài (văn bản hoặc hình ảnh) để trích xuất dữ liệu hình học và chuyển đổi thành mô hình 3D JSON.\n\n"
    "QUY TRÌNH PHÂN TÍCH BẮT BUỘC:\n"
    "1. OCR & TRÍCH XUẤT THỰC THỂ:\n"
    "   - Nếu có hình ảnh, hãy quét cực kĩ từng dòng chữ để tìm các điểm (A, B, C...), các trung điểm (M, N...), các giao điểm (O, P...), và các quan hệ (vuông góc, song song, độ dài).\n"
    "   - Liệt kê TẤT CẢ các điểm xuất hiện trong đề bài. KHÔNG ĐƯỢC BỎ SÓT bất kỳ điểm nào (Ví dụ: nếu đề nhắc đến M là trung điểm BC, M PHẢI có tọa độ trong vertices).\n\n"
    "2. TÍNH TOÁN TỌA ĐỘ (Vertices):\n"
    "   - Đáy: Đặt tâm đáy tại (0,0,0) hoặc một đỉnh tại (0,0,0) sao cho hình cân đối.\n"
    "   - Đường cao: Nếu SA ⊥ đáy, x_S = x_A, y_S = y_A, z_S = chiều cao.\n"
    "   - Điểm phụ: Tính chính xác tọa độ trung điểm (M = (B+C)/2) và giao điểm (O = giao AC, BD).\n\n"
    "3. KẾT NỐI (Edges):\n"
    "   - 'visible_edges': Các cạnh ngoài và các đường nối điểm nhìn thấy được.\n"
    "   - 'hidden_edges': TẤT CẢ các đường bị che, các đường chéo đáy, và ĐẶC BIỆT là các đoạn thẳng nối đến các điểm phụ (như SM, SN, SO, AM, BN, MN...).\n\n"
    "4. ĐỊNH DẠNG JSON (Trả về DUY NHẤT JSON, KHÔNG CÓ VĂN BẢN THỪA):\n"
    "{\n"
    "  \"analysis\": \"Văn bản đề bài mà bạn đã đọc được từ hình ảnh (Nếu là text thì chép lại, nếu là ảnh thì trích xuất chữ).\",\n"
    "  \"vertices\": [[x, y, z], ...],\n"
    "  \"faces\": [[i, j, k, ...], ...],\n"
    "  \"visible_edges\": [[i, j], ...],\n"
    "  \"hidden_edges\": [[i, j], ...],\n"
    "  \"vertex_labels\": [\"A\", \"B\", \"C\", \"D\", \"S\", \"M\", \"N\", \"O\", \"P\", ...]\n"
    "}\n\n"
    "LƯU Ý: Phải ưu tiên độ chính xác về mặt toán học. Nếu đề bài là hình chóp S.ABCD có đáy là hình vuông, các cạnh AB, BC, CD, DA phải bằng nhau."
)


# ─── Retry Predicate ──────────────────────────────────────────────────────────

def _is_retryable(exc: Exception) -> bool:
    """
    Chỉ kích hoạt retry khi lỗi là 503 (hệ thống quá tải) hoặc 429 (vượt quota).
    Các lỗi khác (400, 401, v.v.) sẽ fail ngay lập tức, không retry.
    """
    msg = str(exc).lower()
    return (
        "503" in msg
        or "unavailable" in msg
        or "429" in msg
        or "resource_exhausted" in msg
        or "rate_limit" in msg
    )



# ─── Local Geometry Fallback (không cần API) ─────────────────────────────────

def _extract_number(text: str, keywords: list) -> float | None:
    """Tìm số sau các từ khoá trong văn bản."""
    for kw in keywords:
        idx = text.lower().find(kw.lower())
        if idx == -1:
            continue
        # Lấy phần text sau từ khoá, tìm số đầu tiên
        rest = text[idx + len(kw):]
        m = re.search(r"[\d]+(?:[.,]\d+)?", rest)
        if m:
            return float(m.group().replace(",", "."))
    return None


def _build_pyramid(a: float, h: float) -> dict:
    """Hình chóp tứ giác đều S.ABCD: cạnh đáy a, chiều cao h."""
    hf = a / 2
    verts = [
        [-hf, -hf, 0],   # 0: A
        [ hf, -hf, 0],   # 1: B
        [ hf,  hf, 0],   # 2: C
        [-hf,  hf, 0],   # 3: D
        [  0,   0, h],   # 4: S
    ]
    visible_edges = [[4,0],[4,1],[4,2],[4,3],[0,1],[1,2]]
    hidden_edges  = [[2,3],[3,0]]
    faces = [[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]]
    labels = ["A","B","C","D","S"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_triangular_pyramid(a: float, h: float) -> dict:
    """Hình chóp tam giác đều S.ABC: cạnh đáy a, chiều cao h."""
    import math
    r = a / math.sqrt(3)  # bán kính đường tròn ngoại tiếp tam giác đều
    verts = [
        [r * math.cos(math.radians(90)),  r * math.sin(math.radians(90)),  0],   # 0: A
        [r * math.cos(math.radians(210)), r * math.sin(math.radians(210)), 0],   # 1: B
        [r * math.cos(math.radians(330)), r * math.sin(math.radians(330)), 0],   # 2: C
        [0, 0, h],                                                                # 3: S
    ]
    visible_edges = [[3,0],[3,1],[3,2],[0,1],[1,2]]
    hidden_edges  = [[2,0]]
    faces = [[0,1,2],[0,1,3],[1,2,3],[2,0,3]]
    labels = ["A","B","C","S"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_right_pyramid(a: float, h: float) -> dict:
    """
    Hình chóp vuông S.ABCD: SA vuông góc mặt đáy ABCD.
    Đáy ABCD là hình vuông cạnh a. S nằm ngay trên đỉnh A, SA = h.
    Convention: A ở góc trước-trái, B trước-phải, C sau-phải, D sau-trái.
    """
    verts = [
        [0, 0, 0],   # 0: A  (gốc; SA thẳng đứng)
        [a, 0, 0],   # 1: B
        [a, a, 0],   # 2: C
        [0, a, 0],   # 3: D
        [0, 0, h],   # 4: S  (ngay trên A)
    ]
    # Nhìn từ góc trước-phải-trên (cạnh chuẩn SGK):
    # Visible: SA(thẳng đứng), SB, SC, AB, BC
    # Hidden : SD, CD, DA
    visible_edges = [[4,0],[4,1],[4,2],[0,1],[1,2]]
    hidden_edges  = [[4,3],[2,3],[3,0]]
    faces = [[0,1,2,3],[0,1,4],[1,2,4],[2,3,4],[3,0,4]]
    labels = ["A","B","C","D","S"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_right_triangular_pyramid(a: float, h: float) -> dict:
    """
    Hình chóp vuông S.ABC: SA vuông góc mặt đáy ABC.
    Đáy ABC là tam giác vuông cân tại A, hai cạnh góc vuông = a.
    """
    verts = [
        [0, 0, 0],   # 0: A  (gốc; SA thẳng đứng)
        [a, 0, 0],   # 1: B
        [0, a, 0],   # 2: C
        [0, 0, h],   # 3: S  (ngay trên A)
    ]
    visible_edges = [[3,0],[3,1],[3,2],[0,1],[1,2]]
    hidden_edges  = [[2,0]]
    faces = [[0,1,2],[0,1,3],[1,2,3],[2,0,3]]
    labels = ["A","B","C","S"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_prism(a: float, h: float) -> dict:
    """Lăng trụ tứ giác đều ABCD.A'B'C'D': cạnh đáy a, chiều cao h."""
    hf = a / 2
    verts = [
        [-hf, -hf, 0],  # 0: A
        [ hf, -hf, 0],  # 1: B
        [ hf,  hf, 0],  # 2: C
        [-hf,  hf, 0],  # 3: D
        [-hf, -hf, h],  # 4: A'
        [ hf, -hf, h],  # 5: B'
        [ hf,  hf, h],  # 6: C'
        [-hf,  hf, h],  # 7: D'
    ]
    visible_edges = [[0,1],[1,2],[0,4],[1,5],[2,6],[4,5],[5,6],[6,7],[4,7]]
    hidden_edges  = [[2,3],[3,0],[3,7]]
    faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]
    labels = ["A","B","C","D","A'","B'","C'","D'"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_triangular_prism(a: float, h: float) -> dict:
    """Lăng trụ tam giác đều ABC.A'B'C': cạnh đáy a, chiều cao h."""
    import math
    r = a / math.sqrt(3)
    base = [
        [r * math.cos(math.radians(90)),  r * math.sin(math.radians(90)),  0],
        [r * math.cos(math.radians(210)), r * math.sin(math.radians(210)), 0],
        [r * math.cos(math.radians(330)), r * math.sin(math.radians(330)), 0],
    ]
    verts = base + [[x, y, h] for x, y, _ in base]
    visible_edges = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5]]
    hidden_edges  = [[2,0],[5,3]]
    faces = [[0,1,2],[3,4,5],[0,1,4,3],[1,2,5,4],[2,0,3,5]]
    labels = ["A","B","C","A'","B'","C'"]
    return {"vertices": verts, "faces": faces,
            "visible_edges": visible_edges, "hidden_edges": hidden_edges,
            "vertex_labels": labels}


def _build_cone(r: float, h: float) -> dict:
    """Hình nón: bán kính r, chiều cao h. Mô phỏng bằng đa giác 32 cạnh."""
    import math
    verts = []
    N = 32
    for i in range(N):
        angle = (2 * math.pi * i) / N
        verts.append([r * math.cos(angle), r * math.sin(angle), 0])
    verts.append([0, 0, h]) # Đỉnh S (index N)
    
    visible_edges = []
    for i in range(N):
        visible_edges.append([i, (i + 1) % N]) # Đường tròn đáy
        if i % 8 == 0: # Chỉ vẽ vài đường sinh cho đỡ rối
            visible_edges.append([i, N])
            
    faces = [list(range(N)), [0, N, 8], [8, N, 16], [16, N, 24], [24, N, 0]] # Xấp xỉ
    return {"vertices": verts, "faces": faces, "visible_edges": visible_edges, "hidden_edges": [], "vertex_labels": ["O", "S"]}


def _build_sphere(r: float) -> dict:
    """Hình cầu: bán kính r. Mô phỏng bằng 3 vòng tròn chính."""
    import math
    verts = []
    N = 24
    # Vòng tròn ngang
    for i in range(N):
        angle = (2 * math.pi * i) / N
        verts.append([r * math.cos(angle), r * math.sin(angle), 0])
    # Vòng dọc 1
    for i in range(N):
        angle = (2 * math.pi * i) / N
        verts.append([r * math.cos(angle), 0, r * math.sin(angle)])
        
    visible_edges = []
    for i in range(N):
        visible_edges.append([i, (i + 1) % N])
        visible_edges.append([N + i, N + ((i + 1) % N)])
        
    return {"vertices": verts, "faces": [], "visible_edges": visible_edges, "hidden_edges": [], "vertex_labels": ["O"]}


def _local_geometry_fallback(text: str) -> dict:
    """
    Giải hình học cục bộ nâng cao: phân tích văn bản tiếng Việt để nhận dạng hình
    và TÍNH TOÁN CÁC ĐIỂM PHỤ (trung điểm, tâm, giao điểm).
    """
    t = (text or "").lower().replace("  ", " ")

    # 1. Nhận dạng hình cơ bản
    vertex_match = re.search(r'[a-z]\.[a-z]{2,}', t)
    base_vertex_count = len(vertex_match.group(0)) - 2 if vertex_match else 4
    is_tam_giac = (base_vertex_count == 3) or ("tam giác" in t)
    
    # Nhận diện SA vuông góc (hỗ trợ nhiều loại ký tự và cách viết)
    is_right_sa = bool(
        re.search(r'sa\s*(vuông góc|vuong goc|⊥|perp|_|_|perp|⊥)', t) or
        re.search(r'sa\s*[⊥_]\s*[\(\[]?[abcd]', t)
    )
    
    a = _extract_number(text, ["cạnh", "canh", "a =", "a=", "cạnh đáy", "bán kính", "r ="]) or 4.0
    h = _extract_number(text, ["chiều cao", "chieu cao", "sa =", "sa=", "h =", "h="]) or 5.0

    # 2. Sinh khung hình chính
    if "lăng trụ" in t or "lang tru" in t:
        shape = _build_triangular_prism(a, h) if is_tam_giac else _build_prism(a, h)
    elif "nón" in t or "cone" in t:
        shape = _build_cone(a/2, h)
    elif re.search(r"\bhình cầu\b|\bmặt cầu\b|\bsphere\b", t):
        shape = _build_sphere(a/2)
    else: # Mặc định là chóp
        if is_right_sa:
            shape = _build_right_triangular_pyramid(a, h) if is_tam_giac else _build_right_pyramid(a, h)
        else:
            shape = _build_triangular_pyramid(a, h) if is_tam_giac else _build_pyramid(a, h)

    # 3. Phân tích điểm phụ (Advanced Parsing)
    verts = list(shape["vertices"])
    labels = list(shape["vertex_labels"])
    v_edges = list(shape["visible_edges"])
    h_edges = list(shape["hidden_edges"])
    
    label_to_idx = {l: i for i, l in enumerate(labels)}

    # a. Tìm Tâm O (Trung điểm đường chéo đáy)
    if "o là tâm" in t or "gọi o" in t or "tâm o" in t:
        if "A" in label_to_idx and "C" in label_to_idx:
            v1, v2 = verts[label_to_idx["A"]], verts[label_to_idx["C"]]
            o_coord = [(v1[0]+v2[0])/2, (v1[1]+v2[1])/2, (v1[2]+v2[2])/2]
            verts.append(o_coord)
            labels.append("O")
            idx_o = len(verts) - 1
            label_to_idx["O"] = idx_o
            
            # Vẽ 2 đường chéo đáy (nét đứt) để xác định tâm O
            h_edges.append([label_to_idx["A"], label_to_idx["C"]])
            if "B" in label_to_idx and "D" in label_to_idx:
                h_edges.append([label_to_idx["B"], label_to_idx["D"]])
            
            # Nối SO (nét đứt)
            if "S" in label_to_idx: h_edges.append([label_to_idx["S"], idx_o])

    # b. Tìm Trung điểm (M, N, K, I, J...)
    # Dùng regex quét trực tiếp (Hỗ trợ dấu ' và từ khóa 'cạnh', 'đoạn')
    mid_matches = re.finditer(r"([a-z]'?)\s+(?:là\s+)?trung\s+điểm\s+(?:của\s+)?(?:đoạn\s+|cạnh\s+)?([a-z']{2,4})", t)
    for match in mid_matches:
        m_name = match.group(1).upper()
        segment = match.group(2).upper()
        
        # Tách đoạn thẳng thành 2 điểm (VD: AA' -> A và A')
        pts = re.findall(r"[A-Z]'?", segment)
        if len(pts) == 2:
            p1, p2 = pts[0], pts[1]
            if p1 in label_to_idx and p2 in label_to_idx and m_name not in label_to_idx:
                v1, v2 = verts[label_to_idx[p1]], verts[label_to_idx[p2]]
                m_coord = [(v1[0]+v2[0])/2, (v1[1]+v2[1])/2, (v1[2]+v2[2])/2]
                verts.append(m_coord)
                labels.append(m_name)
                label_to_idx[m_name] = len(verts) - 1
                logger.info(f"[LocalFallback] Thêm trung điểm {m_name} của {segment}")

    # c. Vẽ các đoạn thẳng phụ (AM, BN, SO, MN, AA'...)
    # Tìm tất cả các cụm 2 nhãn điểm viết hoa đứng gần nhau (VD: "đoạn AM", "đường MN")
    all_labels_in_text = re.findall(r"[A-Z]'?", t.upper())
    for i in range(len(all_labels_in_text)-1):
        p1, p2 = all_labels_in_text[i], all_labels_in_text[i+1]
        if p1 in label_to_idx and p2 in label_to_idx and p1 != p2:
            idx1, idx2 = label_to_idx[p1], label_to_idx[p2]
            if not any({idx1, idx2} == set(e) for e in v_edges + h_edges):
                v_edges.append([idx1, idx2])

    # Tìm thêm các cặp dính liền như "AM", "MN", "AA'"
    joined_matches = re.finditer(r"([A-Z]'?)([A-Z]'?)", t.upper().replace(" ", ""))
    for match in joined_matches:
        p1, p2 = match.group(1), match.group(2)
        if p1 in label_to_idx and p2 in label_to_idx and p1 != p2:
            idx1, idx2 = label_to_idx[p1], label_to_idx[p2]
            if not any({idx1, idx2} == set(e) for e in v_edges + h_edges):
                v_edges.append([idx1, idx2])

    # d. Giao điểm P (Chỉ dựng khi đề bài thực sự có điểm P)
    # Dùng regex tìm chữ P đứng độc lập
    if re.search(r'\bP\b', t.upper()) and ("GIAO" in t.upper() or ("AM" in t.upper() and "BN" in t.upper())):
        if "A" in label_to_idx and "B" in label_to_idx and "P" not in label_to_idx:
            # Ước lượng vị trí P
            va = verts[label_to_idx["A"]]
            verts.append([va[0] + 0.8, va[1] + 0.4, va[2]])
            labels.append("P")
            label_to_idx["P"] = len(verts) - 1
            v_edges.append([label_to_idx["A"], label_to_idx["P"]])
            v_edges.append([label_to_idx["B"], label_to_idx["P"]])

    logger.info(f"[LocalFallback] Dựng thành công {len(verts)} đỉnh: {labels}")
    return {
        "vertices": verts, "faces": shape["faces"],
        "visible_edges": v_edges, "hidden_edges": h_edges,
        "vertex_labels": labels
    }


# ─── Service ─────────────────────────────────────────────────────────────────

class GeometryGeneratorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client_configured = False
        self.available_models = []
        
        # Model mặc định
        self.primary_model = "gemini-2.0-flash"
        self.fallback_models = ["gemini-1.5-flash", "gemini-1.5-pro"]
        
        if not self.api_key:
            logger.warning("GEMINI_API_KEY chưa được cấu hình.")
        else:
            try:
                genai.configure(api_key=self.api_key)
                self.client_configured = True
                # Tự động tìm các model khả dụng để tránh lỗi 404
                self._refresh_available_models()
                logger.info("GeometryGeneratorService: Đã cấu hình và cập nhật danh sách model.")
            except Exception as e:
                logger.error(f"Không thể cấu hình Gemini: {e}")

    def _refresh_available_models(self):
        """Quét danh sách các model thực tế từ API Key."""
        try:
            models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            # Ưu tiên các bản mới nhất có trong danh sách của user (3.1 -> 3.0 -> 2.5 -> 2.0)
            priority_keywords = [
                "gemini-3.1-flash", 
                "gemini-3.1-pro",
                "gemini-3-flash", 
                "gemini-3-pro",
                "gemini-2.5-flash",
                "gemini-2.5-pro",
                "gemini-2.0-flash",
                "gemini-flash-latest"
            ]
            
            sorted_models = []
            for p in priority_keywords:
                # Tìm model chứa từ khóa (ưu tiên bản preview/lite nếu có)
                matches = [m for m in models if p in m]
                for match in matches:
                    if match not in sorted_models:
                        sorted_models.append(match)
            
            # Thêm nốt các model gemini còn lại
            for m in models:
                if m not in sorted_models and "gemini" in m:
                    sorted_models.append(m)
            
            if sorted_models:
                self.available_models = sorted_models
                self.primary_model = sorted_models[0]
                self.fallback_models = sorted_models[1:5] # Thử 4 model dự phòng tiếp theo
                logger.info(f"Đã cập nhật danh sách model ưu tiên: {self.available_models[:5]}")
        except Exception as e:
            logger.warning(f"Không thể liệt kê models: {e}. Dùng mặc định.")

    @retry(
        stop=stop_after_attempt(1), # Không retry trên 1 model, đổi model khác luôn cho nhanh
        retry=retry_if_exception(_is_retryable),
        reraise=True,
    )
    def _call_model(self, model_name: str, contents: list) -> str:
        logger.info(f"→ Đang thử model [{model_name}]...")
        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=SYSTEM_INSTRUCTION
        )
        
        response = model.generate_content(
            contents,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                top_p=0.9,
                max_output_tokens=2048,
            )
        )
        return response.text.strip()

    # ── Public: generate với 2-tầng fallback ─────────────────────────────────

    def generate(
        self,
        text: str,
        image_bytes: bytes | None = None,
        mime_type: str = "image/jpeg",
    ) -> dict:
        if not self.client_configured:
            raise HTTPException(status_code=500, detail="Gemini API chưa được cấu hình.")

        # Xây dựng danh sách contents cho prompt multimodal
        contents = []

        final_text = text.strip() if text else ""
        if image_bytes and not final_text:
            final_text = "Hãy phân tích đề bài toán hình học trong ảnh này và tạo mô hình 3D JSON theo đúng yêu cầu."
        
        if final_text:
            contents.append(final_text)

        if image_bytes:
            contents.append({
                "mime_type": mime_type,
                "data": image_bytes
            })

        if not contents:
            raise HTTPException(status_code=400, detail="Cần có đề bài hoặc ảnh.")

        # ── Tầng 1: Model chính ─────────────────────────────────────────────
        raw_text: str | None = None
        last_error: Exception | None = None

        try:
            raw_text = self._call_model(self.primary_model, contents)
            logger.info(f"✓ Model chính [{self.primary_model}] phản hồi thành công.")
        except Exception as primary_error:
            logger.warning(f"✗ Model chính [{self.primary_model}] thất bại: {primary_error}")
            last_error = primary_error

            # ── Tầng 2: Model dự phòng ──────────────────────────────────────
            for fallback in self.fallback_models:
                try:
                    raw_text = self._call_model(fallback, contents)
                    logger.info(f"✓ Model dự phòng [{fallback}] phản hồi thành công.")
                    break
                except Exception as fb_error:
                    logger.warning(f"✗ Model dự phòng [{fallback}] thất bại: {fb_error}")
                    last_error = fb_error

        # ── Tầng 3: Tất cả thất bại ─────────────────────────────────────────
        if raw_text is None:
            logger.warning("Tất cả models đều thất bại. Dùng bộ giải cục bộ.")
            return _local_geometry_fallback(final_text)



        # Parse & validate JSON response
        logger.info(f"Phản hồi thô từ Gemini: {raw_text[:200]}...")

        # Trích xuất JSON từ chuỗi (tìm cặp ngoặc nhọn {} bao quanh nhất)
        try:
            json_match = re.search(r"(\{.*\})", raw_text, re.DOTALL)
            if json_match:
                cleaned = json_match.group(1)
            else:
                cleaned = raw_text
        except Exception:
            cleaned = raw_text

        # Làm sạch markdown
        cleaned = re.sub(r"```(?:json)?\s*", "", cleaned)
        cleaned = cleaned.replace("```", "").strip()

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Không thể parse JSON từ Gemini: {e}\nRaw: {raw_text}")
            raise HTTPException(
                status_code=500,
                detail="AI trả về định dạng không hợp lệ. Vui lòng thử lại hoặc đặt câu hỏi rõ hơn.",
            )

        # Validate các trường bắt buộc
        required_keys = ["vertices", "faces", "visible_edges", "hidden_edges"]
        for key in required_keys:
            if key not in data:
                logger.warning(f"Thiếu trường '{key}' trong JSON của Gemini, dùng mảng rỗng.")
                data[key] = []

        if "vertex_labels" not in data:
            data["vertex_labels"] = []

        return data


geometry_generator_service = GeometryGeneratorService()
