from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from pydantic import BaseModel
from ..services.quiz_service import quiz_service

router = APIRouter()

class QuizRequest(BaseModel):
    shape_type: str
    params: Dict[str, Any]

class QuizResponse(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    try:
        quiz = await quiz_service.generate_quiz(request.shape_type, request.params)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
