import os
import logging
import time
from fastapi import HTTPException
from dotenv import load_dotenv
import google.generativeai as genai

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
            self.model = None
        else:
            try:
                genai.configure(api_key=self.api_key)
                self.primary_model_name = "gemini-2.0-flash"
                self.fallback_model_name = "gemini-1.5-flash"
                
                # System Instruction
                self.system_instruction = (
                    "Bạn là một chuyên gia toán học và gia sư hình học không gian 3D tận tâm. "
                    "Hãy hướng dẫn học sinh từng bước tính toán tọa độ, tìm giao tuyến, hoặc chứng minh thiết diện. "
                    "Không bao giờ cung cấp ngay đáp án cuối cùng. Hãy đặt câu hỏi ngược lại để học sinh tự suy nghĩ.\n\n"
                    "QUAN TRỌNG VỀ ĐIỀU KHIỂN GIAO DIỆF 3D:\n"
                    "NẾU học sinh yêu cầu bạn đổi hình dạng khối, cắt mặt phẳng, thay đổi tham số, hoặc tô màu mặt phẳng cắt (thiết diện), "
                    "hãy đính kèm một khối code JSON ở phần cuối cùng trong câu trả lời của bạn với cú pháp chuẩn xác sau.\n"
                    "```json:Action\n"
                    "{\n"
                    "  \"action\": \"update_scene\",\n"
                    "  \"shape_type\": \"pyramid_triangle\",\n"
                    "  \"params\": {\"base_size\": 4, \"height\": 5},\n"
                    "  \"plane\": {\"normal\": [0, 0, 1], \"point\": [0, 0, 2]},\n"
                    "  \"color\": \"#ff0000\"\n"
                    "}\n"
                    "```\n"
                )
                self.model = genai.GenerativeModel(
                    model_name=self.primary_model_name,
                    system_instruction=self.system_instruction
                )
            except Exception as e:
                logger.error(f"Không thể khởi tạo GenerativeModel: {e}")
                self.model = None

    def get_response(self, user_message: str, chat_history: list) -> str:
        if not self.model:
            logger.error("Gọi API nhưng quá trình khởi tạo model GenAI đã thất bại hoặc thiếu API Key.")
            raise HTTPException(status_code=500, detail="Máy chủ chưa được cấu hình API Key cho Gemini.")

        # Chuyển đổi chat_history sang định dạng legacy: [{"role": "user", "parts": ["..."]}, ...]
        history = []
        for msg in chat_history:
            role = "user" if msg.get("role") == "user" else "model"
            history.append({"role": role, "parts": [msg.get("content", "")]})

        max_retries = 3
        # Tầng 1: Model chính
        for attempt in range(max_retries):
            try:
                chat = self.model.start_chat(history=history)
                response = chat.send_message(user_message)
                return response.text
            except Exception as e:
                error_msg = str(e)
                if any(x in error_msg for x in ["429", "503", "exhausted", "demand", "unavailable"]):
                    if attempt < max_retries - 1:
                        logger.warning(f"Gemini API busy. Retrying in {attempt + 1}s...")
                        time.sleep(attempt + 1)
                        continue
                logger.error(f"Model chính thất bại: {e}")
                break

        # Tầng 2: Model dự phòng
        try:
            logger.info(f"→ Thử model dự phòng...")
            fb_model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=self.system_instruction
            )
            chat = fb_model.start_chat(history=history)
            response = chat.send_message(user_message)
            return response.text
        except Exception as e:
            logger.error(f"Tất cả models đều thất bại: {e}")
            return "Gia sư AI hiện đang nhận được quá nhiều yêu cầu cùng lúc. Vui lòng chờ vài giây rồi đặt câu hỏi tiếp nhé!"

math_tutor_service = MathTutorService()     model=self.fallback_model,
                history=formatted_history,
                config=config
            )
            response = chat.send_message(user_message)
            return response.text
        except Exception as e:
            logger.error(f"Tất cả models đều thất bại: {e}")
            return "Gia sư AI hiện đang nhận được quá nhiều yêu cầu cùng lúc. Vui lòng chờ vài giây rồi đặt câu hỏi tiếp nhé!"


math_tutor_service = MathTutorService()
