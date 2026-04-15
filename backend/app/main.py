import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import geometry, cross_section, ai, chat, geometry_generator

app = FastAPI(
    title="Hệ Sinh Thái STEM Toán 3D",
    description="Backend API cho mô hình hình học 3D tương tác",
    version="1.0.0",
)

# Đọc allowed origins từ biến môi trường (production) hoặc dùng localhost (dev)
_origins_env = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _origins_env.split(",") if o.strip()]
    if _origins_env
    else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(geometry.router, prefix="/api/geometry", tags=["Hình học 3D"])
app.include_router(cross_section.router, prefix="/api/cross-section", tags=["Thiết diện"])
app.include_router(ai.router, prefix="/api/ai", tags=["Gia sư AI"])
app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chatbot Gia sư"])
app.include_router(geometry_generator.router, prefix="/api/v1/geometry", tags=["AI Geometry Generator"])


@app.get("/")
async def root():
    return {"message": "STEM Toán 3D API v1.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
