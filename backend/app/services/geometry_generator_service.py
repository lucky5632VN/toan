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

from google import genai
from google.genai import types

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
    "Bạn là một chuyên gia hình học không gian. "
    "Hãy đọc đề bài (văn bản hoặc hình ảnh) và bóc tách các dữ kiện không gian. "
    "Trả về DUY NHẤT một chuỗi JSON thuần túy (không có markdown code block, không có ```json) theo cấu trúc sau:\n"
    "{\n"
    "  \"vertices\": [[x, y, z], ...],\n"
    "  \"faces\": [[i, j, k, ...], ...],\n"
    "  \"visible_edges\": [[i, j], ...],\n"
    "  \"hidden_edges\": [[i, j], ...],\n"
    "  \"vertex_labels\": [\"A\", \"B\", ...]\n"
    "}\n\n"
    "QUY TẮC BẮT BUỘC:\n"
    "1. Tự tính toán toạ độ (x, y, z) sao cho hình cân đối và dễ nhìn nhất (ưu tiên căn giữa gốc toạ độ).\n"
    "2. Các cạnh bị che khuất (nằm phía sau mặt khối, không nhìn thấy từ góc nhìn phổ biến) "
    "phải được đưa vào mảng 'hidden_edges'. Ví dụ: đáy phía dưới của hình chóp, cạnh đường chéo bị che.\n"
    "3. Các cạnh nhìn thấy trực tiếp đưa vào 'visible_edges'.\n"
    "4. Tất cả chỉ số trong 'faces', 'visible_edges', 'hidden_edges' đều là chỉ số (index) trong mảng 'vertices', bắt đầu từ 0.\n"
    "5. KHÔNG trả lời thêm gì ngoài chuỗi JSON. Không giải thích. Chỉ JSON thuần túy."
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
    Giải hình học cục bộ: phân tích văn bản tiếng Việt để nhận dạng hình
    và tạo tọa độ 3D mà không cần Gemini API.
    """
    t = (text or "").lower()

    # ── Nhận dạng số đỉnh đáy từ ký hiệu hình học (S.ABCD → 4, S.ABC → 3) ──
    vertex_match = re.search(r'[a-z]\.[a-z]{2,}', t)
    base_vertex_count = len(vertex_match.group(0)) - 2 if vertex_match else 4
    is_tam_giac = (base_vertex_count == 3) or ("tam giác" in t)

    is_chop = "chóp" in t or "chop" in t
    is_lang_tru = "lăng trụ" in t or "lang tru" in t
    is_non = "nón" in t or "cone" in t
    is_cau = "cầu" in t or "sphere" in t

    # ── Phát hiện SA⊥(ABCD) — hình chóp vuông ────────────────────────────────
    is_right_angle_sa = bool(
        re.search(r'sa\s*[⊥_]\s*[\(\[]?[abcd]', t) or
        re.search(r'sa\s+vuông\s+góc', t) or
        re.search(r'sa\s+vuong\s+goc', t)
    )

    # ── Trích xuất kích thước ─────────────────────────────────────────────────
    a = _extract_number(text, ["cạnh", "canh", "a =", "a=", "cạnh đáy", "bán kính", "r ="]) or 6.0

    # SA=số → dùng làm chiều cao; SA=a → chiều cao bằng cạnh đáy
    sa_match = re.search(r'sa\s*=\s*([a-z0-9]+(?:[.,]\d+)?)', t)
    if sa_match:
        raw = sa_match.group(1)
        try:
            h = float(raw.replace(",", "."))
        except ValueError:
            h = a
    else:
        h = _extract_number(text, ["chiều cao", "chieu cao", "h =", "h="]) or a

    logger.info(
        f"[LocalFallback] text='{text[:60]}' "
        f"is_chop={is_chop} is_lang_tru={is_lang_tru} is_non={is_non} is_cau={is_cau} a={a} h={h}"
    )

    if is_cau:
        return _build_sphere(a/2)
    if is_non:
        return _build_cone(a/2, h)
    if is_chop:
        if is_right_angle_sa:
            if is_tam_giac: return _build_right_triangular_pyramid(a, h)
            return _build_right_pyramid(a, h)
        if is_tam_giac: return _build_triangular_pyramid(a, h)
        return _build_pyramid(a, h)
    if is_lang_tru:
        if is_tam_giac: return _build_triangular_prism(a, h)
        return _build_prism(a, h)
    
    return _build_pyramid(a, h)



# ─── Service ─────────────────────────────────────────────────────────────────

class GeometryGeneratorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY chưa được cấu hình. GeometryGenerator sẽ trả về lỗi.")
            self.client = None
        else:
            try:
                self.client = genai.Client(api_key=self.api_key)
                logger.info("GeometryGeneratorService: Gemini Client đã khởi tạo thành công.")
            except Exception as e:
                logger.error(f"Không thể khởi tạo Gemini Client: {e}")
                self.client = None

        # Model chính – sử dụng bản 2.0-flash ổn định
        self.primary_model = "gemini-2.0-flash"

        # Danh sách model dự phòng theo thứ tự ưu tiên (nhẹ hơn, ít quá tải hơn)
        self.fallback_models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash-8b",
        ]

    # ── Private: gọi một model cụ thể, có @retry bọc ngoài ──────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception(_is_retryable),
        reraise=True,  # Ném exception gốc sau khi hết lần retry
    )
    def _call_model(self, model_name: str, parts: list, config) -> str:
        """
        Gọi Gemini API với một model cụ thể.
        Decorator @retry tự động thử lại tối đa 3 lần nếu gặp lỗi 503/429,
        với khoảng chờ lũy thừa: lần 1 → 2s, lần 2 → 4s, lần 3 → 8s.
        """
        logger.info(f"→ Đang gọi model [{model_name}]...")
        response = self.client.models.generate_content(
            model=model_name,
            contents=parts,
            config=config,
        )
        return response.text.strip()

    # ── Public: generate với 2-tầng fallback ─────────────────────────────────

    def generate(
        self,
        text: str,
        image_bytes: bytes | None = None,
        mime_type: str = "image/jpeg",
    ) -> dict:
        """
        Nhận văn bản đề bài và/hoặc bytes ảnh.
        Trả về dict với keys: vertices, faces, visible_edges, hidden_edges, vertex_labels.

        Cơ chế lỗi:
          - Tầng 1: Thử primary_model, retry tối đa 3 lần nếu 503/429.
          - Tầng 2: Lần lượt thử từng fallback_model (cũng có retry).
          - Tầng 3: Raise HTTPException(503) nếu tất cả đều thất bại.
        """
        if not self.client:
            raise HTTPException(
                status_code=500,
                detail="Server chưa cấu hình GEMINI_API_KEY hoặc khởi tạo client bị lỗi.",
            )

        # Xây dựng danh sách parts cho prompt multimodal
        parts: list = []

        if text and text.strip():
            parts.append(types.Part.from_text(text=text.strip()))

        if image_bytes:
            parts.append(
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            )

        if not parts:
            raise HTTPException(
                status_code=400,
                detail="Yêu cầu phải có ít nhất văn bản đề bài hoặc ảnh.",
            )

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
        )

        # ── Tầng 1: Model chính (có retry bên trong _call_model) ─────────────
        raw_text: str | None = None
        last_error: Exception | None = None

        try:
            raw_text = self._call_model(self.primary_model, parts, config)
            logger.info(f"✓ Model chính [{self.primary_model}] phản hồi thành công.")
        except Exception as primary_error:
            logger.warning(
                f"✗ Model chính [{self.primary_model}] thất bại sau 3 lần retry. "
                f"Lỗi: {primary_error}"
            )
            last_error = primary_error

            # ── Tầng 2: Lần lượt thử từng model dự phòng ─────────────────────
            for fallback in self.fallback_models:
                try:
                    raw_text = self._call_model(fallback, parts, config)
                    logger.info(f"✓ Model dự phòng [{fallback}] phản hồi thành công.")
                    break  # Thoát ngay khi có model thành công
                except Exception as fb_error:
                    logger.warning(f"✗ Model dự phòng [{fallback}] cũng thất bại: {fb_error}")
                    last_error = fb_error

        # ── Tầng 3: Tất cả model đều thất bại → Dùng bộ giải cục bộ ──────────
        if raw_text is None:
            logger.warning(f"Tất cả models đều thất bại. Dùng bộ giải hình học cục bộ. Lỗi: {last_error}")
            return _local_geometry_fallback(text)

        # ── Parse & validate JSON response ────────────────────────────────────
        # Làm sạch markdown nếu model vẫn cố gắng wrap code block
        cleaned = re.sub(r"```(?:json)?\s*", "", raw_text)
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
