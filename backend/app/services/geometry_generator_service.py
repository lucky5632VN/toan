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

        # Model chính – ưu tiên suy luận hình học chính xác
        self.primary_model = "gemini-2.5-flash"

        # Danh sách model dự phòng theo thứ tự ưu tiên (nhẹ hơn, ít quá tải hơn)
        self.fallback_models = [
            "gemini-2.0-flash",
            "gemini-1.5-flash-latest",
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

        # ── Tầng 3: Tất cả model đều thất bại ────────────────────────────────
        if raw_text is None:
            logger.error(f"Tất cả models đều thất bại. Lỗi cuối: {last_error}")
            raise HTTPException(
                status_code=503,
                detail="Hệ thống AI đang quá tải, vui lòng thử lại sau vài phút.",
            )

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
