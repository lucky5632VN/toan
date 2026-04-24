from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class GenerateRequest(BaseModel):
    shape_type: str = Field(description="Loại hình: pyramid_square, pyramid_triangle, prism_regular, box, cone, sphere")
    params: Dict[str, Any] = Field(default_factory=dict, description="Tham số hình khối")


class ShapeResponse(BaseModel):
    vertices: List[List[float]]
    edges: List[List[int]]
    faces: List[List[int]]
    vertex_labels: List[str]
    properties: Dict[str, Any]
    shape_type: str


class PlaneDefinition(BaseModel):
    normal: List[float] = Field(description="Vector pháp tuyến [a, b, c] (hệ tọa độ z-up)")
    point: List[float] = Field(description="Điểm trên mặt phẳng [x0, y0, z0]")


class CrossSectionRequest(BaseModel):
    vertices: List[List[float]] = Field(description="Danh sách đỉnh hình khối (z-up)")
    edges: List[List[int]] = Field(description="Danh sách cạnh [idx_a, idx_b]")
    plane: PlaneDefinition


class CrossSectionResponse(BaseModel):
    polygon_vertices: List[List[float]]
    area: float
    perimeter: float
    shape_name: str
    num_vertices: int
    error: Optional[str] = None


class AIChatRequest(BaseModel):
    message: str
    context: Dict[str, Any]


class AIChatResponse(BaseModel):
    response: str


class MathTutorChatRequest(BaseModel):
    user_message: str
    chat_history: List[Dict[str, str]] = Field(
        default_factory=list, 
        description="Lịch sử chat dưới định dạng [{'role': 'user', 'content': 'tin nhắn'}, ...]"
    )


class MathTutorChatResponse(BaseModel):
    response: str


class GeometryGeneratorResponse(BaseModel):
    """Response trả về bởi AI Geometry Generator (Text/Image → 3D)."""
    analysis: Optional[str] = Field(default="", description="Văn bản đề bài AI đã đọc được")
    vertices: List[List[float]] = Field(description="Mảng toạ độ các đỉnh [x, y, z]")
    faces: List[List[int]] = Field(description="Mảng mặt, mỗi mặt là danh sách chỉ số đỉnh")
    visible_edges: List[List[int]] = Field(description="Các cạnh nhìn thấy (nét liền)")
    hidden_edges: List[List[int]] = Field(description="Các cạnh bị khuất (nét đứt)")
    vertex_labels: List[str] = Field(default_factory=list, description="Nhãn tên các đỉnh (A, B, C, S, ...)")
