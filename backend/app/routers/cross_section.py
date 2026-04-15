from fastapi import APIRouter, HTTPException
from ..models.schemas import CrossSectionRequest, CrossSectionResponse
from ..services.cross_section import compute_cross_section

router = APIRouter()

@router.post("/compute", response_model=CrossSectionResponse)
async def compute(request: CrossSectionRequest):
    try:
        result = compute_cross_section(
            vertices=request.vertices,
            edges=request.edges,
            plane_normal=request.plane.normal,
            plane_point=request.plane.point
        )
        if result.get("error"):
            # Trả về 200 nhưng có thông tin lỗi trong body để frontend hiển thị message
            return result
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tính toán thiết diện: {str(e)}")
