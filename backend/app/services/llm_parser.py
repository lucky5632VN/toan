"""
LLM Parser – Placeholder cho Giai đoạn 3 (AI Tutor).
Sẽ được tích hợp với OpenAI GPT-4o và Whisper API.
"""


def parse_natural_language_command(text: str) -> dict:
    """
    Phân tích lệnh ngôn ngữ tự nhiên của học sinh thành cấu trúc lệnh.
    Ví dụ: "Vẽ mặt phẳng song song với đáy tại z=3"
    → {"action": "cross_section", "plane": {"normal": [0,0,1], "point": [0,0,3]}}

    TODO (Giai đoạn 3): Kết nối GPT-4o API.
    """
    return {
        "status": "placeholder",
        "message": "AI Tutor sẽ được kích hoạt ở Giai đoạn 3",
        "parsed_command": None,
    }
