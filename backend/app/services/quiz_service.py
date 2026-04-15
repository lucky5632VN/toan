import json
import logging
import asyncio
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

class QuizSchema(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class QuizService:
    def __init__(self):
        self.client = None
        if API_KEY:
            try:
                self.client = genai.Client(api_key=API_KEY)
            except Exception:
                self.client = None
        
        # Sử dụng model gemini-2.0-flash (Cân bằng giữa tốc độ và ổn định)
        self.model_name = "gemini-2.0-flash"
        
        # Bộ cấu hình logging
        self.logger = logging.getLogger(__name__)
        
        # Bộ nhớ đệm đơn giản để tránh gọi API liên tục cho cùng 1 thông số
        self._quiz_cache = {}

    async def generate_quiz(self, shape_type: str, params: Dict[str, Any]) -> dict:
        if not self.client:
            return {
                "question": f"Ví dụ: Cho khối {shape_type} với tham số {params}, thể tích khối là bao nhiêu?",
                "options": ["A. Rất lớn", "B. Vừa phải", "C. Nhỏ", "D. Không thể tính (Thiếu API Key)"],
                "correct_answer": "D. Không thể tính (Thiếu API Key)",
                "explanation": "Vì chưa có GEMINI_API_KEY nên hệ thống tạo câu hỏi mẫu này."
            }

        system_instruction = "Bạn là giáo viên Toán. Dựa vào thông số hình học 3D hiện tại mà người dùng đang xem, hãy tạo 1 câu hỏi trắc nghiệm tính toán (thể tích, diện tích, góc, khoảng cách). Trả về cấu trúc JSON gồm: question, options, correct_answer, explanation."

        # Thử kiểm tra cache trước
        cache_key = f"{shape_type}_{json.dumps(params, sort_keys=True)}"
        if cache_key in self._quiz_cache:
            self.logger.info(f"Using cached quiz for {cache_key}")
            return self._quiz_cache[cache_key]

        prompt = f"""
        [CHỦ ĐỀ ĐỀ BÀI]
        Loại hình khối: {shape_type}
        Tham số kích thước: {params}
        
        Hãy sinh bài tập trắc nghiệm toán học tương ứng với khối hình này.
        """

        max_retries = 3
        retry_delay = 1 # giây

        for attempt in range(max_retries):
            try:
                # Dùng run_in_executor nếu SDK bloocking hoặc gọi trực tiếp nếu hỗ trợ async (Client genai thường sync)
                # Ở đây chúng ta bọc try-except cho 429
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=QuizSchema,
                        temperature=0.7
                    )
                )
                result = json.loads(response.text)
                # Lưu vào cache
                self._quiz_cache[cache_key] = result
                return result
            except Exception as e:
                error_msg = str(e)
                # Bắt cả lỗi 429 (Rate Limit) và 503 (Model quá tải/Unvailable)
                if any(x in error_msg for x in ["429", "503", "exhausted", "demand", "unavailable"]):
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                    else:
                        return {
                            "question": "Hệ thống AI đang bận (Tăng cường độ ổn định). Bạn hãy thử lại sau vài giây.",
                            "options": ["A. Chờ đợi", "B. Thử lại ngay", "C. Xem hình", "D. Đã hiểu"],
                            "correct_answer": "D. Đã hiểu",
                            "explanation": "Do bạn dùng gói Gemini Free, thỉnh thoảng Google sẽ giới hạn số lượt truy vấn. Đừng lo lắng, hãy thử lại nhé!"
                        }
                raise Exception(f"Lỗi khi gọi Gemini sinh bài tập: {error_msg}")

quiz_service = QuizService()

