"""
Router: /api/v1/geometry/generate
Nhận văn bản hoặc ảnh, trả về JSON toạ độ hình học 3D do Gemini tạo sinh.
"""
import logging
from fastapi import APIRouter, Form, File, UploadFile
from typing import Optional

from ..services.geometry_generator_service import geometry_generator_service
from ..models.schemas import GeometryGeneratorResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate", response_model=GeometryGeneratorResponse)
async def generate_geometry(
    text: str = Form(default="", description="Đề bài hình học dưới dạng văn bản"),
    file: Optional[UploadFile] = File(default=None, description="Ảnh chụp đề bài (jpg/png/webp)"),
):
    """
    Chuyển đổi văn bản đề bài hoặc ảnh thành JSON toạ độ hình học 3D.
    Sử dụng Google Gemini multimodal để phân tích và tạo sinh toạ độ.
    """
    image_bytes: Optional[bytes] = None
    mime_type = "image/jpeg"

    if file and file.filename:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
        logger.info(f"Nhận ảnh: {file.filename} ({len(image_bytes)} bytes, {mime_type})")

    result = geometry_generator_service.generate(
        text=text,
        image_bytes=image_bytes,
        mime_type=mime_type,
    )

    return GeometryGeneratorResponse(**result)
