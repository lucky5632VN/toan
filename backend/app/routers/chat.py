from fastapi import APIRouter
from ..models.schemas import MathTutorChatRequest, MathTutorChatResponse
from ..services.math_tutor_service import math_tutor_service

router = APIRouter()

@router.post("/math-tutor", response_model=MathTutorChatResponse)
def math_tutor_chat(request: MathTutorChatRequest):
    """
    Endpoint giao tiếp với Gia Sư AI Toán học của nền tảng qua Gemini API.
    """
    response_text = math_tutor_service.get_response(
        user_message=request.user_message,
        chat_history=request.chat_history
    )
    return MathTutorChatResponse(response=response_text)
