import os
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict, Any, List

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)
    # Using gemini-1.5-flash-latest as requested
    model = genai.GenerativeModel('gemini-1.5-flash')
else:
    model = None

SYSTEM_PROMPT = """
Bạn là một Gia sư Toán học STEM chuyên nghiệp, tập trung vào Hình học không gian lớp 11.
Phong cách của bạn:
1. Thân thiện, khuyến khích, sử dụng ngôn ngữ sư phạm dễ hiểu.
2. Phương pháp Socratic: Không đưa ra đáp án ngay, hãy gợi ý các bước tư duy.
3. Chuyên môn: Giải thích các khái niệm như diện tích đáy, chiều cao, đường sinh, thiết diện, và các công thức liên quan.
4. Ngôn ngữ: Tiếng Việt.

Ngữ cảnh hiện tại:
Bạn đang quan sát một mô hình 3D mà học sinh đang tương tác. 
Dữ liệu hình khối sẽ được gửi kèm trong tin nhắn. Hãy dựa vào thông số thực tế đó để giải thích.
"""

class AIService:
    def __init__(self):
        self.chat_session = None
        if model:
            self.chat_session = model.start_chat(history=[])

    async def get_response(self, message: str, context: Dict[str, Any]) -> str:
        if not API_KEY or not model:
            return "Xin lỗi, Gemini API Key chưa được cấu hình. Tôi đang chạy ở chế độ giả lập: 'Đây là một hình khối rất đẹp!'"

        # Cấu trúc lại prompt với ngữ cảnh hình học
        shape_info = f"""
[THÔNG TIN HÌNH KHỐI HIỆN TẠI]
- Loại hình: {context.get('shape_type')}
- Tham số: {context.get('params')}
- Thuộc tính tính toán: {context.get('properties')}
"""
        full_prompt = f"{SYSTEM_PROMPT}\n{shape_info}\n\nHọc sinh hỏi: {message}"

        try:
            response = self.chat_session.send_message(full_prompt)
            return response.text
        except Exception as e:
            return f"Có lỗi xảy ra khi kết nối với Gemini: {str(e)}"

ai_service = AIService()
