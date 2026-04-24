import os
import logging
import time
from fastapi import HTTPException
from dotenv import load_dotenv

from google import genai
from google.genai import types

# Tải file .env để lấy GEMINI_API_KEY
load_dotenv()

# Cấu hình logging đúng chuẩn
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MathTutorService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("Cảnh báo: GEMINI_API_KEY chưa được cấu hình. Chatbot AI sẽ trả về lỗi.")
            self.client = None
        else:
            try:
                # Sử dụng thư viện google-genai mới
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Không thể khởi tạo GenAI Client: {e}")
                self.client = None
                
        # Model configuration
        self.primary_model = "gemini-2.0-flash"
        self.fallback_model = "gemini-1.5-flash"
        
        # System Instruction (Socratic Method + UI Control)
        # ... (rest of the instruction string remains the same)
        self.system_instruction = (
            "Bạn là một chuyên gia toán học và gia sư hình học không gian 3D tận tâm. "
            "Hãy hướng dẫn học sinh từng bước tính toán tọa độ, tìm giao tuyến, hoặc chứng minh thiết diện. "
            "Không bao giờ cung cấp ngay đáp án cuối cùng. Hãy đặt câu hỏi ngược lại để học sinh tự suy nghĩ.\n\n"
            "QUAN TRỌNG VỀ ĐIỀU KHIỂN GIAO DIỆF 3D:\n"
            "NẾU học sinh yêu cầu bạn đổi hình dạng khối, cắt mặt phẳng, thay đổi tham số, hoặc tô màu mặt phẳng cắt (thiết diện), "
            "hãy đính kèm một khối code JSON ở phần cuối cùng trong câu trả lời của bạn với cú pháp chuẩn xác sau "
            "(thay đổi các giá trị cho phù hợp, chỉ xuất hiện nếu cần thực hiện lệnh):\n"
            "```json:Action\n"
            "{\n"
            "  \"action\": \"update_scene\",\n"
            "  \"shape_type\": \"pyramid_triangle\",\n"
            "  \"params\": {\"base_size\": 4, \"height\": 5},\n"
            "  \"plane\": {\"normal\": [0, 0, 1], \"point\": [0, 0, 2]},\n"
            "  \"color\": \"#ff0000\"\n"
            "}\n"
            "```\n"
            "Lưu ý:\n"
            "- Các chuỗi `shape_type` hợp lệ: `pyramid_square`, `pyramid_triangle`, `prism_regular`, `box`, `cone`, `sphere`.\n"
            "- Tham số (params) có `base_size` (cạnh đáy) và `height` (chiều cao), `n_sides` (cạnh prism).\n"
            "- `plane` để quy định vị trí và pháp tuyến mặt cắt.\n"
            "- `color` nhận mã HEX để tô màu vùng mặt cắt.\n\n"
            "TÍNH NĂNG 'NHẬP BÀI TOÁN - TỰ VẼ HÌNH':\n"
            "NẾU học sinh nhập một bài toán có tọa độ phức tạp (ví dụ: chóp S.ABCD mà SA vuông đáy), "
            "hãy sử dụng hình học không gian tự tính toán tạo độ `x,y,z` và trả về JSON sau để hệ thống dựng hình Độc Nhất vô nhị (custom shape):\n"
            "```json:Action\n"
            "{\n"
            "  \"action\": \"create_custom\",\n"
            "  \"data\": {\n"
            "    \"vertices\": [[0,0,0], [4,0,0], [4,3,0], [0,3,0], [0,0,5]],\n"
            "    \"edges\": [[0,1], [1,2], [2,3], [3,0], [0,4], [1,4], [2,4], [3,4]],\n"
            "    \"faces\": [[0,1,2,3], [0,1,4], [1,2,4], [2,3,4], [3,0,4]],\n"
            "    \"vertex_labels\": [\"A\", \"B\", \"C\", \"D\", \"S\"]\n"
            "  }\n"
            "}\n"
            "```\n"
            "- Luôn đồng bộ lời văn tư vấn thích hợp và chỉ nhúng phần code khối `json:Action` vào cuối cùng nếu cần điều khiển màn hình nhé."
        )

    def get_response(self, user_message: str, chat_history: list) -> str:
        if not self.client:
            logger.error("Gọi API nhưng quá trình khởi tạo client GenAI đã thất bại hoặc thiếu API Key.")
            raise HTTPException(status_code=500, detail="Máy chủ chưa được cấu hình API Key cho Gemini hoặc kết nối lỗi.")

        formatted_history = []
        for msg in chat_history:
            role = "user" if msg.get("role") == "user" else "model"
            text_content = msg.get("content", "")
            part = types.Part.from_text(text=text_content)
            formatted_history.append(types.Content(role=role, parts=[part]))

        config = types.GenerateContentConfig(
            system_instruction=self.system_instruction,
            temperature=0.7,
        )

        max_retries = 3
        # Tầng 1: Model chính
        for attempt in range(max_retries):
            try:
                chat = self.client.chats.create(
                    model=self.primary_model,
                    history=formatted_history,
                    config=config
                )
                response = chat.send_message(user_message)
                return response.text
                
            except Exception as e:
                error_msg = str(e)
                if any(x in error_msg for x in ["429", "503", "exhausted", "demand", "unavailable"]):
                    if attempt < max_retries - 1:
                        logger.warning(f"Gemini API busy ({self.primary_model}). Retrying in {attempt + 1}s...")
                        time.sleep(attempt + 1)
                        continue
                logger.error(f"Model chính [{self.primary_model}] thất bại: {e}")
                break

        # Tầng 2: Model dự phòng
        try:
            logger.info(f"→ Thử model dự phòng [{self.fallback_model}]...")
            chat = self.client.chats.create(
                model=self.fallback_model,
                history=formatted_history,
                config=config
            )
            response = chat.send_message(user_message)
            return response.text
        except Exception as e:
            logger.error(f"Tất cả models đều thất bại: {e}")
            return "Gia sư AI hiện đang nhận được quá nhiều yêu cầu cùng lúc. Vui lòng chờ vài giây rồi đặt câu hỏi tiếp nhé!"


math_tutor_service = MathTutorService()
