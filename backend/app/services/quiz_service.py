import os
import json
import logging
import asyncio
import random
import google.generativeai as genai
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

# ─── Ngân hàng câu hỏi dự phòng (dùng khi API Gemini không khả dụng) ──────────

QUESTION_BANK: Dict[str, List[dict]] = {
    "pyramid": [
        {
            "question": "Cho hình chóp tứ giác đều S.ABCD có đáy là hình vuông cạnh 6 cm và chiều cao SA = 4 cm. Thể tích khối chóp là bao nhiêu?",
            "options": ["A. 48 cm³", "B. 72 cm³", "C. 144 cm³", "D. 96 cm³"],
            "correct_answer": "A. 48 cm³",
            "explanation": "Thể tích hình chóp: V = (1/3) × B × h = (1/3) × 6² × 4 = (1/3) × 36 × 4 = 48 cm³."
        },
        {
            "question": "Hình chóp tam giác đều S.ABC có đáy là tam giác đều cạnh 6 cm và chiều cao h = 4 cm. Diện tích đáy bằng bao nhiêu?",
            "options": ["A. 9√3 cm²", "B. 18 cm²", "C. 12√3 cm²", "D. 36 cm²"],
            "correct_answer": "A. 9√3 cm²",
            "explanation": "Diện tích tam giác đều cạnh a: B = (√3/4)×a² = (√3/4)×36 = 9√3 cm²."
        },
        {
            "question": "Hình chóp tứ giác S.ABCD có đáy ABCD là hình chữ nhật 3cm × 4cm, chiều cao h = 6cm. Thể tích khối chóp là:",
            "options": ["A. 12 cm³", "B. 24 cm³", "C. 72 cm³", "D. 36 cm³"],
            "correct_answer": "B. 24 cm³",
            "explanation": "V = (1/3) × B × h = (1/3) × (3×4) × 6 = (1/3) × 12 × 6 = 24 cm³."
        },
    ],
    "prism": [
        {
            "question": "Hình lăng trụ tam giác đều ABC.A'B'C' có cạnh đáy bằng 4 cm và chiều cao bằng 9 cm. Thể tích khối lăng trụ là bao nhiêu?",
            "options": ["A. 36√3 cm³", "B. 48 cm³", "C. 36 cm³", "D. 72 cm³"],
            "correct_answer": "A. 36√3 cm³",
            "explanation": "Diện tích đáy tam giác đều cạnh 4: B = (√3/4)×16 = 4√3 cm². Thể tích: V = B × h = 4√3 × 9 = 36√3 cm³."
        },
        {
            "question": "Lăng trụ đứng tứ giác đều ABCD.A'B'C'D' có cạnh đáy a = 5 cm và chiều cao h = 10 cm. Diện tích xung quanh bằng bao nhiêu?",
            "options": ["A. 200 cm²", "B. 150 cm²", "C. 250 cm²", "D. 100 cm²"],
            "correct_answer": "A. 200 cm²",
            "explanation": "Diện tích xung quanh = Chu vi đáy × chiều cao = (4 × 5) × 10 = 200 cm²."
        },
    ],
    "sphere": [
        {
            "question": "Khối cầu bán kính R = 3 cm. Thể tích khối cầu là bao nhiêu?",
            "options": ["A. 36π cm³", "B. 108π cm³", "C. 12π cm³", "D. 72π cm³"],
            "correct_answer": "A. 36π cm³",
            "explanation": "V = (4/3)πR³ = (4/3)π×27 = 36π cm³."
        },
        {
            "question": "Diện tích mặt cầu bán kính R = 5 cm là:",
            "options": ["A. 25π cm²", "B. 50π cm²", "C. 100π cm²", "D. 500π/3 cm²"],
            "correct_answer": "C. 100π cm²",
            "explanation": "Diện tích mặt cầu: S = 4πR² = 4π×25 = 100π cm²."
        },
        {
            "question": "Một quả bóng có chu vi lớn nhất bằng 6π cm. Thể tích quả bóng là:",
            "options": ["A. 36π cm³", "B. 12π cm³", "C. 9π cm³", "D. 4π cm³"],
            "correct_answer": "A. 36π cm³",
            "explanation": "Chu vi lớn nhất = 2πR → R = 3 cm. V = (4/3)πR³ = (4/3)π×27 = 36π cm³."
        },
    ],
    "cone": [
        {
            "question": "Hình nón có bán kính đáy R = 3 cm và chiều cao h = 4 cm. Thể tích hình nón là:",
            "options": ["A. 12π cm³", "B. 36π cm³", "C. 48π cm³", "D. 9π cm³"],
            "correct_answer": "A. 12π cm³",
            "explanation": "V = (1/3)πR²h = (1/3)π×9×4 = 12π cm³."
        },
        {
            "question": "Hình nón có đường sinh l = 5 cm và bán kính đáy R = 3 cm. Diện tích xung quanh bằng:",
            "options": ["A. 9π cm²", "B. 15π cm²", "C. 25π cm²", "D. 12π cm²"],
            "correct_answer": "B. 15π cm²",
            "explanation": "Diện tích xung quanh hình nón = πRl = π×3×5 = 15π cm²."
        },
    ],
    "cross_section": [
        {
            "question": "Thiết diện của hình cầu bán kính R cắt bởi mặt phẳng cách tâm một khoảng d = R/2 là hình gì?",
            "options": ["A. Hình elip", "B. Hình tròn bán kính R√3/2", "C. Hình tròn bán kính R/2", "D. Không tồn tại"],
            "correct_answer": "B. Hình tròn bán kính R√3/2",
            "explanation": "Thiết diện của hình cầu với mặt phẳng luôn là hình tròn. Bán kính r = √(R² - d²) = √(R² - R²/4) = R√(3/4) = R√3/2."
        },
        {
            "question": "Mặt phẳng (P) song song với đáy và cách đỉnh S một khoảng bằng 1/3 chiều cao h của hình chóp tam giác S.ABC. Tỉ lệ diện tích thiết diện so với đáy là:",
            "options": ["A. 1/9", "B. 1/3", "C. 2/3", "D. 4/9"],
            "correct_answer": "A. 1/9",
            "explanation": "Thiết diện song song đáy ở tỉ lệ k = 1/3 so với chiều cao → đồng dạng với tỉ số k = 1/3. Diện tích thiết diện = k² × S_đáy = 1/9 × S_đáy."
        },
    ],
    "default": [
        {
            "question": "Trong không gian Oxyz, điểm nào sau đây thuộc mặt phẳng Oxy?",
            "options": ["A. M(1, 2, 3)", "B. N(0, 0, 5)", "C. P(3, 4, 0)", "D. Q(1, 0, 1)"],
            "correct_answer": "C. P(3, 4, 0)",
            "explanation": "Mặt phẳng Oxy là tập hợp các điểm có tọa độ z = 0. Điểm P(3, 4, 0) có z = 0 nên thuộc mặt phẳng Oxy."
        },
        {
            "question": "Công thức tính thể tích khối lăng trụ có diện tích đáy B và chiều cao h là:",
            "options": ["A. V = B·h/3", "B. V = B·h", "C. V = 2·B·h", "D. V = B·h/2"],
            "correct_answer": "B. V = B·h",
            "explanation": "Thể tích khối lăng trụ = Diện tích đáy × chiều cao. Công thức: V = B × h."
        },
        {
            "question": "Trong hình học không gian, hệ trục tọa độ Oxyz được cấu tạo bởi bao nhiêu trục?",
            "options": ["A. 1 trục", "B. 2 trục", "C. 3 trục vuông góc từng đôi một", "D. 4 trục"],
            "correct_answer": "C. 3 trục vuông góc từng đôi một",
            "explanation": "Hệ tọa độ Oxyz gồm 3 trục Ox, Oy, Oz đôi một vuông góc nhau, tuân theo quy tắc bàn tay phải."
        },
    ]
}

def get_fallback_question(shape_type: str) -> dict:
    """Lấy câu hỏi ngẫu nhiên từ ngân hàng dự phòng."""
    bank = QUESTION_BANK.get(shape_type, QUESTION_BANK["default"])
    # Thêm câu hỏi mặc định vào pool để tăng đa dạng
    full_pool = bank + QUESTION_BANK["default"]
    return random.choice(full_pool)


class QuizService:
    def __init__(self):
        if API_KEY:
            try:
                genai.configure(api_key=API_KEY)
            except Exception:
                pass
        
        # Model configuration
        self.primary_model_name = "gemini-2.0-flash"
        self.fallback_model_name = "gemini-1.5-flash"
        self.logger = logging.getLogger(__name__)
        self._quiz_cache = {}

    async def generate_quiz(self, shape_type: str, params: Dict[str, Any]) -> dict:
        """
        Lấy bài tập trực tiếp từ kho câu hỏi đã biên soạn (Question Bank) 
        để đảm bảo tính chính xác cao và tối ưu hoá tốc độ phản hồi.
        """
        self.logger.info(f"Lấy câu hỏi từ kho bài tập cho chủ đề: {shape_type}")
        return get_fallback_question(shape_type)

quiz_service = QuizService()
