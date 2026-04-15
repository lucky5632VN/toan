from fastapi import APIRouter, HTTPException
from ..models.schemas import AIChatRequest, AIChatResponse
from ..services.ai_service import ai_service

router = APIRouter()

@router.post("/chat", response_model=AIChatResponse)
async def chat(request: AIChatRequest):
    try:
        response_text = await ai_service.get_response(request.message, request.context)
        return AIChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi AI Tutor: {str(e)}")
