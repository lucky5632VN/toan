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
                
                # Làm sạch JSON (đề phòng model vẫn trả về markdown ```json)
                raw_text = response.text
                import re
                cleaned = re.sub(r"```(?:json)?\s*", "", raw_text)
                cleaned = cleaned.replace("```", "").strip()
                
                result = json.loads(cleaned)
                self._quiz_cache[cache_key] = result
                return result
                
            except Exception as e:
                error_msg = str(e)
                self.logger.error(f"Attempt {attempt+1} failed: {error_msg}")
                
                # Nếu là lỗi có thể thử lại (429, 503) và chưa hết số lần thử
                if any(x in error_msg.lower() for x in ["429", "503", "exhausted", "demand", "unavailable"]):
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        continue
                
                # Nếu hết lần thử hoặc là lỗi khác, trả về fallback thay vì crash 500
                return {
                    "question": "Hệ thống AI đang được bảo trì hoặc quá tải. Hãy thử lại sau vài giây.",
                    "options": ["A. Chờ đợi", "B. Thử lại", "C. Quay lại sau", "D. Đã hiểu"],
                    "correct_answer": "D. Đã hiểu",
                    "explanation": "Có thể kết nối mạng hoặc dịch vụ AI đang gặp gián đoạn tạm thời. Đừng lo lắng, hình học 3D của bạn vẫn an toàn!"
                }

quiz_service = QuizService()

