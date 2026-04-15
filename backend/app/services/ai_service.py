import os
from google import genai
from google.genai import types
from dotenv import load_dotenv
from typing import Dict, Any

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

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
        self.client = None
        if API_KEY:
            try:
                self.client = genai.Client(api_key=API_KEY)
            except Exception:
                self.client = None
        
        self.model_name = "gemini-2.0-flash"

    async def get_response(self, message: str, context: Dict[str, Any]) -> str:
        if not self.client:
            return "Xin lỗi, Gemini API Key chưa được cấu hình. Tôi đang chạy ở chế độ giả lập: 'Đây là một hình khối rất đẹp!'"

        shape_info = f"""
[THÔNG TIN HÌNH KHỐI HIỆN TẠI]
- Loại hình: {context.get('shape_type')}
- Tham số: {context.get('params')}
- Thuộc tính tính toán: {context.get('properties')}
"""
        full_prompt = f"{SYSTEM_PROMPT}\n{shape_info}\n\nHọc sinh hỏi: {message}"

        try:
            # Dùng trực tiếp generate_content thay vì chat session cho AI Service cũ
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=full_prompt
            )
            return response.text
        except Exception as e:
            return f"Có lỗi xảy ra khi kết nối với Gemini: {str(e)}"

ai_service = AIService()
