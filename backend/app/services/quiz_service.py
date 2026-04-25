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
import random
import math
from typing import List, Dict, Any

def get_fallback_question(shape_type: str) -> dict:
    """
    Sinh câu hỏi toán học ngẫu nhiên dựa trên thuật toán (Algorithmic Question Generator).
    Tạo ra hàng trăm biến thể câu hỏi khác nhau bằng cách thay đổi ngẫu nhiên các thông số.
    """
    # Nếu chọn "tất cả", chọn ngẫu nhiên 1 loại hình
    if shape_type == "all" or shape_type == "default" or shape_type == "current":
        shape_type = random.choice(["pyramid", "prism", "sphere", "cone", "cross_section"])

    if shape_type == "pyramid":
        # Biến thể 1: Chóp tứ giác đều
        if random.random() > 0.5:
            a = random.randint(3, 12)
            h = random.randint(3, 15)
            v = (a * a * h) / 3.0
            v_rounded = round(v, 2)
            
            question = f"Cho hình chóp tứ giác đều S.ABCD có đáy là hình vuông cạnh {a} cm và chiều cao h = {h} cm. Thể tích khối chóp là bao nhiêu?"
            correct = f"{v_rounded} cm³"
            options = [
                correct,
                f"{round(v * 1.5, 2)} cm³",
                f"{round(v * 3, 2)} cm³",
                f"{round(v / 2, 2)} cm³"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Thể tích hình chóp: V = (1/3) × S_đáy × h = (1/3) × {a}² × {h} = {v_rounded} cm³."
            }
        # Biến thể 2: Chóp tam giác đều
        else:
            a = random.randint(4, 12)
            base_area = (math.sqrt(3) / 4.0) * (a * a)
            base_rounded = round(base_area, 2)
            
            question = f"Hình chóp tam giác đều S.ABC có đáy là tam giác đều cạnh {a} cm. Diện tích mặt đáy của hình chóp bằng bao nhiêu?"
            correct = f"{base_rounded} cm²"
            options = [
                correct,
                f"{round(base_area * 1.2, 2)} cm²",
                f"{round(base_area * 2, 2)} cm²",
                f"{round(base_area / 2, 2)} cm²"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Diện tích tam giác đều cạnh a: S = (√3/4) × a² = (√3/4) × {a}² = {base_rounded} cm²."
            }

    elif shape_type == "prism":
        # Biến thể 1: Lăng trụ đứng tứ giác đều (diện tích xung quanh)
        if random.random() > 0.5:
            a = random.randint(3, 10)
            h = random.randint(5, 15)
            s_xq = 4 * a * h
            
            question = f"Lăng trụ đứng tứ giác đều ABCD.A'B'C'D' có cạnh đáy a = {a} cm và chiều cao h = {h} cm. Diện tích xung quanh của lăng trụ bằng bao nhiêu?"
            correct = f"{s_xq} cm²"
            options = [
                correct,
                f"{s_xq + 20} cm²",
                f"{s_xq - 15} cm²",
                f"{s_xq * 2} cm²"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Diện tích xung quanh = Chu vi đáy × chiều cao = (4 × {a}) × {h} = {s_xq} cm²."
            }
        # Biến thể 2: Thể tích lăng trụ
        else:
            a = random.randint(2, 8)
            h = random.randint(5, 12)
            b = a * a
            v = b * h
            
            question = f"Hình hộp chữ nhật có đáy là hình vuông cạnh {a} cm, chiều cao h = {h} cm. Thể tích của khối hộp là bao nhiêu?"
            correct = f"{v} cm³"
            options = [
                correct,
                f"{round(v / 3.0, 2)} cm³",
                f"{v * 2} cm³",
                f"{v + 10} cm³"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Thể tích khối hộp: V = S_đáy × h = ({a} × {a}) × {h} = {v} cm³."
            }

    elif shape_type == "sphere":
        r = random.randint(2, 10)
        # Biến thể 1: Thể tích khối cầu
        if random.random() > 0.5:
            v_factor = (4/3) * (r ** 3)
            v_factor_rounded = round(v_factor, 2)
            
            question = f"Khối cầu có bán kính R = {r} cm. Thể tích của khối cầu là bao nhiêu?"
            correct = f"{v_factor_rounded}π cm³"
            options = [
                correct,
                f"{round(v_factor * 3, 2)}π cm³",
                f"{round(v_factor / 2, 2)}π cm³",
                f"{round(4 * (r**2), 2)}π cm³"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Thể tích khối cầu: V = (4/3)πR³ = (4/3) × π × {r}³ = {v_factor_rounded}π cm³."
            }
        # Biến thể 2: Diện tích mặt cầu
        else:
            s_factor = 4 * (r ** 2)
            
            question = f"Diện tích của mặt cầu có bán kính R = {r} cm bằng bao nhiêu?"
            correct = f"{s_factor}π cm²"
            options = [
                correct,
                f"{s_factor * 2}π cm²",
                f"{s_factor / 2}π cm²",
                f"{round(s_factor * 1.33, 2)}π cm²"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Diện tích mặt cầu: S = 4πR² = 4 × π × {r}² = {s_factor}π cm²."
            }

    elif shape_type == "cone":
        r = random.randint(3, 8)
        h = random.randint(4, 12)
        # Biến thể 1: Thể tích hình nón
        if random.random() > 0.5:
            v_factor = (1/3) * (r * r) * h
            v_rounded = round(v_factor, 2)
            
            question = f"Hình nón có bán kính đáy R = {r} cm và chiều cao h = {h} cm. Thể tích hình nón là:"
            correct = f"{v_rounded}π cm³"
            options = [
                correct,
                f"{round(v_factor * 3, 2)}π cm³",
                f"{round(v_factor / 2, 2)}π cm³",
                f"{round(v_factor * 2, 2)}π cm³"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Thể tích hình nón: V = (1/3)πR²h = (1/3) × π × {r}² × {h} = {v_rounded}π cm³."
            }
        # Biến thể 2: Diện tích xung quanh (cần tính l)
        else:
            # Chọn l và r sao cho tạo thành bộ số Pythagore nếu được
            # Đơn giản ta tính l = sqrt(r^2+h^2)
            l = math.sqrt(r*r + h*h)
            l_rounded = round(l, 2)
            s_xq = r * l
            s_rounded = round(s_xq, 2)
            
            question = f"Hình nón có bán kính đáy R = {r} cm và đường sinh l = {l_rounded} cm. Diện tích xung quanh bằng bao nhiêu?"
            correct = f"{s_rounded}π cm²"
            options = [
                correct,
                f"{round(s_xq * 1.5, 2)}π cm²",
                f"{round(s_xq / 2, 2)}π cm²",
                f"{round(r * h, 2)}π cm²"
            ]
            random.shuffle(options)
            return {
                "question": question,
                "options": options,
                "correct_answer": correct,
                "explanation": f"Diện tích xung quanh hình nón: S_xq = π × R × l = π × {r} × {l_rounded} = {s_rounded}π cm²."
            }

    elif shape_type == "cross_section":
        # Biến thể: Thiết diện mặt cầu
        r = random.randint(5, 13)
        d = random.randint(3, r - 1) # khoảng cách d < r
        r_td = math.sqrt(r*r - d*d)
        r_td_rounded = round(r_td, 2)
        
        question = f"Thiết diện của hình cầu bán kính R = {r} cm cắt bởi mặt phẳng cách tâm một khoảng d = {d} cm là hình tròn có bán kính bằng bao nhiêu?"
        correct = f"{r_td_rounded} cm"
        options = [
            correct,
            f"{round(r_td * 1.2, 2)} cm",
            f"{round(r_td - 1, 2)} cm",
            f"{round(math.sqrt(r*r + d*d), 2)} cm"
        ]
        random.shuffle(options)
        return {
            "question": question,
            "options": options,
            "correct_answer": correct,
            "explanation": f"Bán kính thiết diện: r = √(R² - d²) = √({r}² - {d}²) = √({r*r - d*d}) = {r_td_rounded} cm."
        }

    # Mặc định nếu lỡ lỗi
    return {
        "question": "Công thức tính thể tích khối lăng trụ có diện tích đáy B và chiều cao h là:",
        "options": ["A. V = B·h/3", "B. V = B·h", "C. V = 2·B·h", "D. V = B·h/2"],
        "correct_answer": "B. V = B·h",
        "explanation": "Thể tích khối lăng trụ = Diện tích đáy × chiều cao. Công thức: V = B × h."
    }



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
