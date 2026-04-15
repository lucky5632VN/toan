# SPATIAL MIND 3D – Hệ Sinh Thái STEM Hình Học Tương Tác Tích Hợp AI

![Project Banner](https://img.shields.io/badge/AI-Gemini_3.1-blue?style=for-the-badge&logo=google-gemini)
![Tech Stack](https://img.shields.io/badge/Three.js-Black?style=for-the-badge&logo=three.dot-js)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)

**SPATIAL MIND 3D** là nền tảng giáo dục hiện đại đột phá, được thiết kế để xóa bỏ sự trừu tượng khô khan trong môn Hình học không gian lớp 11. Bằng cách kết hợp giữa đồ họa 3D thời gian thực (Three.js) và Trí tuệ nhân tạo thế hệ mới (Gemini 3.1 Flash-Lite), hệ sinh thái này biến mọi bài toán thành một trải nghiệm trực quan sống động.

---

## ✨ Tính Năng Cốt Lõi

### 1. 🎲 Parametric Design & Visual Theory
- **Điều khiển tham số (Leva Sliders)**: Cho phép học sinh trực tiếp kéo thanh trượt để thay đổi chiều cao, bán kính, số cạnh của các khối Chóp, Lăng trụ, Nón, Trụ... Hình khối sẽ biến dạng ngay lập tức theo thời gian thực.
- **Trực quan hóa nét đứt/liền**: Hệ thống tự động xử lý thuật toán "khử mặt khuất", hiển thị đúng quy ước toán học Việt Nam (nét bị che là nét đứt).

### 2. 🧠 AI Auto Quiz Generation (Gemini 3.1)
- **Cá nhân hóa theo thực tế**: AI tự đọc các thông số hình học (h, r, base size) mà học sinh đang xem để sinh ra câu hỏi trắc nghiệm tương ứng.
- **Chấm điểm & Giải thích**: Không chỉ đưa ra đáp án Đúng/Sai, hệ thống còn đổ xuống phần giải thích lý thuyết chi tiết để học sinh tự sửa sai.
- **Cơ chế Caching & Retry**: Hệ thống được tối ưu hóa để chống lỗi Rate Limit của API Free, đảm bảo trải nghiệm học tập liên tục.

### 3. 🤖 AI Tutor Socratic Chat
- **Gia sư 1-1**: Chatbot AI đóng vai trò người dẫn dắt, không giải hộ mà đặt câu hỏi ngược lại để gợi mở tư duy (Phương pháp Socrate).
- **Điều khiển Scene bằng ngôn ngữ tự nhiên**: Bạn có thể gõ "Hãy cắt khối chóp này bằng mặt phẳng ngang", AI sẽ tự động tính toán và vẽ mặt cắt (thiết diện) lên màn hình.

### 4. 📐 AI Geometry Generator
- **Chụp ảnh để vẽ hình**: Chỉ cần tải lên bức ảnh đề bài trong sách giáo khoa, AI sẽ phân tích giả thiết và dựng mô hình 3D hoàn chỉnh chỉ trong vài giây.

---

## 🚀 Hướng Dẫn Cài Đặt

### 1. Yêu Cầu Hệ Thống
- Node.js (v18+)
- Python (3.9+)
- API Key của Google Gemini (Miễn phí)

### 2. Cài Đặt Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Hoặc venv\Scripts\activate trên Windows
pip install -r requirements.txt
# Tạo file .env và dán GEMINI_API_KEY=your_key_here
python run.py
```

### 3. Cài Đặt Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠 Công Nghệ Sử Dụng

- **Frontend**: React, Vite, Three.js (@react-three/fiber), Leva, Lucide-React, Zustand.
- **Backend**: FastAPI (Python), Google GenAI SDK 1.0, Pydantic, Tenacity.
- **AI Model**: `gemini-3.1-flash-lite-preview` (Tối ưu hóa tốc độ và quota).

---

## 📖 Triết Lý Sư Phạm

Dự án áp dụng triệt để **Khung sư phạm 5E**:
- **Engage**: Thu hút bằng hình ảnh 3D đẹp mắt.
- **Explore**: Khám phá qua các thanh trượt tham số.
- **Explain**: Gia sư AI giải thích căn kẽ lý thuyết.
- **Elaborate**: Vận dụng vào các bài toán thiết diện phức tạp.
- **Evaluate**: Đánh giá năng lực qua hệ thống Quiz thông minh.

---
*Phát triển bởi đội ngũ đam mê công nghệ giáo dục – Vì một thế hệ giỏi tư duy không gian.*
