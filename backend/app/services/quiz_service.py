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
    Sinh câu hỏi toán học ngẫu nhiên phong phú dựa trên thuật toán.
    Mở rộng thêm nhiều dạng đề phức tạp: Thể tích, diện tích, ngoại tiếp, nội tiếp, đường chéo, góc...
    """
    if shape_type == "all" or shape_type == "default" or shape_type == "current":
        shape_type = random.choice(["pyramid", "prism", "sphere", "cone", "cross_section"])

    if shape_type == "pyramid":
        sub_type = random.randint(0, 5)
        if sub_type == 0:
            a = random.randint(3, 10)
            h = random.randint(3, 12)
            v = round((a * a * h) / 3.0, 2)
            options = [str(v), str(round(v*3, 2)), str(round(v/2, 2)), str(round(v+15, 2))]
            random.shuffle(options)
            return {
                "question": f"Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng {a} cm và chiều cao h = {h} cm. Tính thể tích khối chóp.",
                "options": options,
                "correct_answer": str(v),
                "explanation": f"Áp dụng công thức: V = (1/3) × S_đáy × h = (1/3) × {a}² × {h} = {v} cm³."
            }
        elif sub_type == 1:
            a = random.randint(4, 12)
            s_day = round((math.sqrt(3) / 4.0) * (a * a), 2)
            options = [str(s_day), str(round(s_day*1.5, 2)), str(round(s_day-5, 2)), str(round(s_day+10, 2))]
            random.shuffle(options)
            return {
                "question": f"Hình chóp tam giác đều S.ABC có đáy là tam giác đều cạnh {a} cm. Diện tích mặt đáy bằng bao nhiêu?",
                "options": options,
                "correct_answer": str(s_day),
                "explanation": f"Diện tích đáy tam giác đều: S = (√3/4) × a² = (√3/4) × {a}² = {s_day} cm²."
            }
        elif sub_type == 2:
            a = random.randint(4, 10)
            h_val = round(a * math.sqrt(3), 2)
            options = [f"{h_val} cm", f"{round(a * math.sqrt(2), 2)} cm", f"{a} cm", f"{round(a / 2, 2)} cm"]
            random.shuffle(options)
            return {
                "question": f"Cho hình chóp S.ABC có đáy tam giác đều cạnh {a} cm, cạnh bên SA vuông góc với đáy. Biết góc giữa SB và đáy là 60°. Chiều cao SA của chóp là:",
                "options": options,
                "correct_answer": f"{h_val} cm",
                "explanation": f"Góc giữa SB và đáy là góc SBA = 60°. Trong tam giác vuông SAB: SA = AB × tan(60°) = {a} × √3 ≈ {h_val} cm."
            }
        elif sub_type == 3:
            a = random.randint(4, 10)
            h = random.randint(6, 15)
            v = round((a * a * h) / 3.0, 2)
            options = [f"{h} cm", f"{h+2} cm", f"{h-1} cm", f"{round(h/2, 1)} cm"]
            random.shuffle(options)
            return {
                "question": f"Cho khối chóp S.ABCD có đáy là hình vuông cạnh {a} cm. Biết thể tích khối chóp bằng {v} cm³. Chiều cao h của khối chóp là:",
                "options": options,
                "correct_answer": f"{h} cm",
                "explanation": f"Từ V = (1/3)×S_đáy×h ⇒ h = 3V / S_đáy = (3 × {v}) / {a}² = {h} cm."
            }
        elif sub_type == 4:
            a = random.randint(3, 6)
            b = random.randint(7, 10)
            h = random.randint(4, 8)
            v = round((a * b * h) / 3.0, 2)
            options = [str(v), str(round(v*1.5, 2)), str(round(v/2, 2)), str(v+10)]
            random.shuffle(options)
            return {
                "question": f"Cho hình chóp S.ABCD có đáy là hình chữ nhật kích thước {a} cm × {b} cm, chiều cao h = {h} cm. Thể tích khối chóp là:",
                "options": options,
                "correct_answer": str(v),
                "explanation": f"Thể tích V = (1/3) × (a × b) × h = (1/3) × {a} × {b} × {h} = {v} cm³."
            }
        else:
            a = random.randint(4, 8)
            h = random.randint(6, 12)
            # Cạnh bên b = sqrt(h^2 + (a*sqrt(2)/2)^2)
            b_sq = h*h + (a*a / 2.0)
            r = round(b_sq / (2.0 * h), 2)
            options = [f"{r} cm", f"{round(r+2, 2)} cm", f"{round(r/2, 2)} cm", f"{a} cm"]
            random.shuffle(options)
            return {
                "question": f"Cho hình chóp tứ giác đều S.ABCD có cạnh đáy bằng {a} cm và chiều cao h = {h} cm. Bán kính R của mặt cầu ngoại tiếp hình chóp này là:",
                "options": options,
                "correct_answer": f"{r} cm",
                "explanation": f"Bán kính cầu ngoại tiếp chóp đều: R = b² / 2h = (h² + R_đáy²) / 2h = ({h}² + {a}²/2) / (2 × {h}) = {r} cm."
            }

    elif shape_type == "prism":
        sub_type = random.randint(0, 5)
        if sub_type == 0:
            a = random.randint(3, 8)
            h = random.randint(6, 12)
            v = a * a * h
            options = [str(v), str(v*2), str(round(v/3, 2)), str(v+20)]
            random.shuffle(options)
            return {
                "question": f"Khối lăng trụ đứng tứ giác đều có cạnh đáy bằng {a} cm và chiều cao bằng {h} cm. Thể tích của khối lăng trụ là:",
                "options": options,
                "correct_answer": str(v),
                "explanation": f"Công thức: V = S_đáy × h = {a}² × {h} = {v} cm³."
            }
        elif sub_type == 1:
            a = random.randint(4, 10)
            h = random.randint(5, 12)
            s_xq = 4 * a * h
            options = [str(s_xq), str(s_xq + a*2), str(s_xq * 2), str(s_xq - 10)]
            random.shuffle(options)
            return {
                "question": f"Lăng trụ đứng tứ giác đều có cạnh đáy a = {a} cm và chiều cao h = {h} cm. Diện tích xung quanh của hình lăng trụ là:",
                "options": options,
                "correct_answer": str(s_xq),
                "explanation": f"S_xq = Chu vi đáy × chiều cao = (4 × {a}) × {h} = {s_xq} cm²."
            }
        elif sub_type == 2:
            a, b, c = random.randint(2, 5), random.randint(4, 6), random.randint(6, 8)
            d = round(math.sqrt(a*a + b*b + c*c), 2)
            options = [f"{d} cm", f"{round(d+2.1, 2)} cm", f"{round(d-1.5, 2)} cm", f"{a+b+c} cm"]
            random.shuffle(options)
            return {
                "question": f"Cho hình hộp chữ nhật có kích thước 3 cạnh lần lượt là {a} cm, {b} cm, {c} cm. Độ dài đường chéo của hình hộp chữ nhật đó là:",
                "options": options,
                "correct_answer": f"{d} cm",
                "explanation": f"Đường chéo d = √(a² + b² + c²) = √({a}² + {b}² + {c}²) = √({a*a + b*b + c*c}) ≈ {d} cm."
            }
        elif sub_type == 3:
            a = random.randint(3, 8)
            h = random.randint(4, 10)
            s_day = a * a
            s_xq = 4 * a * h
            s_tp = s_xq + 2 * s_day
            options = [str(s_tp), str(s_xq), str(s_tp + 10), str(s_tp - 15)]
            random.shuffle(options)
            return {
                "question": f"Một khối lăng trụ tứ giác đều có cạnh đáy bằng {a} cm và chiều cao {h} cm. Diện tích toàn phần của khối lăng trụ là:",
                "options": options,
                "correct_answer": str(s_tp),
                "explanation": f"S_tp = S_xq + 2 × S_đáy = (4 × {a} × {h}) + 2 × {a}² = {s_xq} + {2*s_day} = {s_tp} cm²."
            }
        elif sub_type == 4:
            a = random.randint(3, 8)
            h = random.randint(5, 12)
            v = round(((a * a * math.sqrt(3)) / 4.0) * h, 2)
            options = [str(v), str(round(v*2, 2)), str(round(v/3, 2)), str(v+12)]
            random.shuffle(options)
            return {
                "question": f"Cho lăng trụ đứng tam giác đều ABC.A'B'C' có cạnh đáy bằng {a} cm và chiều cao bằng {h} cm. Thể tích khối lăng trụ là:",
                "options": options,
                "correct_answer": str(v),
                "explanation": f"V = S_đáy × h = ((√3/4) × {a}²) × {h} = {v} cm³."
            }
        else:
            a = random.randint(4, 10)
            s_tp = 6 * (a * a)
            options = [str(s_tp), str(s_tp/2), str(s_tp+20), str(4*a*a)]
            random.shuffle(options)
            return {
                "question": f"Một khối lập phương có cạnh bằng {a} cm. Diện tích toàn phần của khối lập phương đó bằng:",
                "options": options,
                "correct_answer": str(s_tp),
                "explanation": f"Diện tích toàn phần khối lập phương: S = 6 × a² = 6 × {a}² = {s_tp} cm²."
            }

    elif shape_type == "sphere":
        sub_type = random.randint(0, 5)
        r = random.randint(2, 10)
        if sub_type == 0:
            v_f = round((4/3) * (r ** 3), 2)
            options = [f"{v_f}π cm³", f"{round(v_f*2, 2)}π cm³", f"{round(v_f/3, 2)}π cm³", f"{4*(r**2)}π cm³"]
            random.shuffle(options)
            return {
                "question": f"Cho một mặt cầu có bán kính R = {r} cm. Tính thể tích của khối cầu tương ứng.",
                "options": options,
                "correct_answer": f"{v_f}π cm³",
                "explanation": f"Công thức: V = (4/3)πR³ = (4/3) × π × {r}³ = {v_f}π cm³."
            }
        elif sub_type == 1:
            s_f = 4 * (r ** 2)
            options = [f"{s_f}π cm²", f"{s_f*2}π cm²", f"{s_f/2}π cm²", f"{round(s_f/3, 2)}π cm²"]
            random.shuffle(options)
            return {
                "question": f"Tính diện tích của mặt cầu có bán kính R = {r} cm.",
                "options": options,
                "correct_answer": f"{s_f}π cm²",
                "explanation": f"Công thức: S = 4πR² = 4 × π × {r}² = {s_f}π cm²."
            }
        elif sub_type == 2:
            s_f = 4 * (r ** 2)
            options = [f"{r} cm", f"{r+2} cm", f"{round(r/2, 1)} cm", f"{r*2} cm"]
            random.shuffle(options)
            return {
                "question": f"Một mặt cầu có diện tích bằng {s_f}π cm². Bán kính R của mặt cầu đó là:",
                "options": options,
                "correct_answer": f"{r} cm",
                "explanation": f"Từ S = 4πR² ⇒ R = √(S / 4π) = √({s_f}π / 4π) = √{r*r} = {r} cm."
            }
        elif sub_type == 3:
            a = random.randint(4, 12)
            r_f = round((a * math.sqrt(3)) / 2.0, 2)
            options = [f"{r_f} cm", f"{a} cm", f"{round(a * math.sqrt(2), 2)} cm", f"{round(a/2, 1)} cm"]
            random.shuffle(options)
            return {
                "question": f"Cho một hình lập phương có cạnh bằng {a} cm. Bán kính R của mặt cầu ngoại tiếp hình lập phương này là:",
                "options": options,
                "correct_answer": f"{r_f} cm",
                "explanation": f"Đường chéo hình lập phương d = a√3. Bán kính mặt cầu ngoại tiếp R = d/2 = ({a}√3)/2 ≈ {r_f} cm."
            }
        elif sub_type == 4:
            a = random.randint(6, 12)
            r_n = round(a / 2.0, 2)
            v_n = round((4/3) * (r_n ** 3), 2)
            options = [f"{v_n}π cm³", f"{round(v_n*2, 2)}π cm³", f"{a}π cm³", f"{round(v_n*3, 2)}π cm³"]
            random.shuffle(options)
            return {
                "question": f"Cho hình lập phương cạnh {a} cm. Thể tích khối cầu nội tiếp hình lập phương này bằng:",
                "options": options,
                "correct_answer": f"{v_n}π cm³",
                "explanation": f"Bán kính khối cầu nội tiếp R = a/2 = {r_n} cm. V = (4/3)πR³ = (4/3) × π × {r_n}³ = {v_n}π cm³."
            }
        else:
            c = round(2 * math.pi * r, 2)
            options = [f"{c} cm", f"{round(c*2, 2)} cm", f"{round(c/2, 2)} cm", f"{r*r} cm"]
            random.shuffle(options)
            return {
                "question": f"Một mặt cầu có bán kính R = {r} cm. Chu vi của đường tròn lớn trên mặt cầu này bằng bao nhiêu?",
                "options": options,
                "correct_answer": f"{c} cm",
                "explanation": f"Chu vi đường tròn lớn: C = 2πR = 2 × π × {r} ≈ {c} cm."
            }

    elif shape_type == "cone":
        sub_type = random.randint(0, 5)
        r = random.randint(3, 8)
        h = random.randint(4, 12)
        if sub_type == 0:
            v_f = round((1/3) * (r * r) * h, 2)
            options = [f"{v_f}π cm³", f"{round(v_f*3, 2)}π cm³", f"{round(v_f/2, 2)}π cm³", f"{v_f*2}π cm³"]
            random.shuffle(options)
            return {
                "question": f"Khối nón có bán kính đáy R = {r} cm và chiều cao h = {h} cm. Thể tích của khối nón là:",
                "options": options,
                "correct_answer": f"{v_f}π cm³",
                "explanation": f"Công thức: V = (1/3)πR²h = (1/3) × π × {r}² × {h} = {v_f}π cm³."
            }
        elif sub_type == 1:
            l = round(math.sqrt(r*r + h*h), 2)
            s_xq = round(r * l, 2)
            options = [f"{s_xq}π cm²", f"{round(r*h, 2)}π cm²", f"{round(s_xq*1.5, 2)}π cm²", f"{round(s_xq/2, 2)}π cm²"]
            random.shuffle(options)
            return {
                "question": f"Cho hình nón có bán kính đáy R = {r} cm và chiều cao h = {h} cm. Diện tích xung quanh của hình nón là:",
                "options": options,
                "correct_answer": f"{s_xq}π cm²",
                "explanation": f"Tính đường sinh l = √(R² + h²) = √({r}² + {h}²) = {l} cm. S_xq = πRl = π × {r} × {l} = {s_xq}π cm²."
            }
        elif sub_type == 2:
            h_val = round(r * math.sqrt(3), 2)
            options = [f"{h_val} cm", f"{r} cm", f"{r*2} cm", f"{round(r*math.sqrt(2), 2)} cm"]
            random.shuffle(options)
            return {
                "question": f"Một hình nón có thiết diện qua trục là một tam giác đều có cạnh bằng {r*2} cm. Chiều cao h của khối nón là:",
                "options": options,
                "correct_answer": f"{h_val} cm",
                "explanation": f"Thiết diện là tam giác đều cạnh 2R = {r*2} ⇒ Đường sinh l = {r*2}, bán kính đáy R = {r}. Chiều cao h = √(l² - R²) = R√3 = {r}√3 ≈ {h_val} cm."
            }
        elif sub_type == 3:
            l = round(math.sqrt(r*r + h*h), 2)
            s_xq = r * l
            s_day = r * r
            s_tp = round(s_xq + s_day, 2)
            options = [f"{s_tp}π cm²", f"{round(s_xq, 2)}π cm²", f"{round(s_tp+10, 2)}π cm²", f"{round(s_tp/2, 2)}π cm²"]
            random.shuffle(options)
            return {
                "question": f"Cho khối nón có bán kính R = {r} cm và đường sinh l = {l} cm. Diện tích toàn phần của khối nón bằng:",
                "options": options,
                "correct_answer": f"{s_tp}π cm²",
                "explanation": f"Công thức: S_tp = S_xq + S_đáy = πRl + πR² = π × {r} × {l} + π × {r}² = {round(s_xq, 2)}π + {s_day}π = {s_tp}π cm²."
            }
        elif sub_type == 4:
            # Quay tam giác vuông
            v_f = round((1/3) * math.pi * (r*r) * h, 2)
            options = [f"{v_f} cm³", f"{round(v_f*3, 2)} cm³", f"{round(v_f/2, 2)} cm³", f"{r*h} cm³"]
            random.shuffle(options)
            return {
                "question": f"Cho tam giác vuông ABC tại A có AB = {r} cm, AC = {h} cm. Khi quay tam giác quanh cạnh AC, khối nón tạo thành có thể tích bằng:",
                "options": options,
                "correct_answer": f"{v_f} cm³",
                "explanation": f"Bán kính R = AB = {r}, Chiều cao H = AC = {h}. Thể tích V = (1/3)πR²H = (1/3) × π × {r}² × {h} ≈ {v_f} cm³."
            }
        else:
            l = random.randint(5, 10)
            s_xq_f = random.randint(15, 40)
            r_val = round(s_xq_f / l, 2)
            options = [f"{r_val} cm", f"{l} cm", f"{round(r_val*2, 2)} cm", f"{round(r_val/2, 2)} cm"]
            random.shuffle(options)
            return {
                "question": f"Một hình nón có diện tích xung quanh bằng {s_xq_f}π cm² và đường sinh l = {l} cm. Bán kính đáy R của hình nón là:",
                "options": options,
                "correct_answer": f"{r_val} cm",
                "explanation": f"Từ S_xq = πRl ⇒ R = S_xq / (πl) = {s_xq_f}π / ({l}π) = {r_val} cm."
            }

    else:
        sub_type = random.randint(0, 2)
        if sub_type == 0:
            r = random.randint(5, 15)
            d = random.randint(3, r - 1)
            r_td = math.sqrt(r*r - d*d)
            s_td = round(math.pi * (r_td**2), 2)
            options = [f"{s_td} cm²", f"{round(s_td*1.5, 2)} cm²", f"{round(s_td/2, 2)} cm²", f"{r*r} cm²"]
            random.shuffle(options)
            return {
                "question": f"Mặt phẳng (P) cắt mặt cầu bán kính R = {r} cm và cách tâm một khoảng d = {d} cm. Tính diện tích của thiết diện tạo thành.",
                "options": options,
                "correct_answer": f"{s_td} cm²",
                "explanation": f"Bán kính thiết diện r' = √(R² - d²) = √({r}² - {d}²) = {round(r_td, 2)} cm. Diện tích thiết diện S = π × (r')² ≈ {s_td} cm²."
            }
        elif sub_type == 1:
            r = random.randint(3, 8)
            h = random.randint(5, 12)
            s_td = 2 * r * h
            options = [f"{s_td} cm²", f"{r*h} cm²", f"{s_td*2} cm²", f"{round(s_td/2, 2)} cm²"]
            random.shuffle(options)
            return {
                "question": f"Hình trụ có bán kính đáy R = {r} cm và chiều cao h = {h} cm. Thiết diện của hình trụ cắt bởi mặt phẳng đi qua trục là một hình chữ nhật có diện tích bằng:",
                "options": options,
                "correct_answer": f"{s_td} cm²",
                "explanation": f"Thiết diện qua trục là hình chữ nhật kích thước 2R × h. Diện tích = 2R × h = 2 × {r} × {h} = {s_td} cm²."
            }
        else:
            r = random.randint(4, 10)
            h = random.randint(6, 15)
            s_td = round(r * h, 2) # (1/2) * 2R * h = R * h
            options = [f"{s_td} cm²", f"{s_td*2} cm²", f"{round(s_td/2, 2)} cm²", f"{r*h*2} cm²"]
            random.shuffle(options)
            return {
                "question": f"Cho hình nón có bán kính đáy R = {r} cm và chiều cao h = {h} cm. Diện tích thiết diện qua trục của hình nón là:",
                "options": options,
                "correct_answer": f"{s_td} cm²",
                "explanation": f"Thiết diện qua trục là tam giác cân có đáy 2R và chiều cao h. Diện tích = (1/2) × 2R × h = R × h = {r} × {h} = {s_td} cm²."
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
