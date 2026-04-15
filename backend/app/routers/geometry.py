from fastapi import APIRouter, HTTPException
from ..models.schemas import GenerateRequest, ShapeResponse
from ..services.geometry_engine import generate_shape

router = APIRouter()

@router.post("/generate", response_model=ShapeResponse)
async def generate(request: GenerateRequest):
    try:
        data = generate_shape(request.shape_type, request.params)
        return data
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi máy chủ: {str(e)}")
