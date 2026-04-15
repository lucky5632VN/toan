"""
Geometry Engine – Động cơ toán học tạo sinh các khối hình học 3D.
Hệ tọa độ: z-up (chuẩn toán học Việt Nam lớp 11)
  - Ox: sang phải
  - Oy: ra phía trước (depth)
  - Oz: lên trên (chiều cao)
"""
import numpy as np
from typing import List, Dict, Any



def generate_shape(shape_type: str, params: Dict[str, Any]) -> Dict:
    """Tạo dữ liệu hình khối từ loại và tham số."""
    if shape_type not in SHAPE_DISPATCHERS:
        raise ValueError(f"Loại hình không hợp lệ: '{shape_type}'. "
                         f"Các loại hợp lệ: {list(SHAPE_DISPATCHERS.keys())}")
    return SHAPE_DISPATCHERS[shape_type](params)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Hình chóp tứ giác đều S.ABCD
# ─────────────────────────────────────────────────────────────────────────────

def _pyramid_square(params: Dict) -> Dict:
    a = float(params.get("base_size", 4.0))
    h = float(params.get("height", 5.0))
    cx, cy = a / 2.0, a / 2.0

    # Đỉnh: A(0,0,0) B(a,0,0) C(a,a,0) D(0,a,0) S(cx,cy,h)
    vertices = [
        [0.0, 0.0, 0.0],   # A
        [a,   0.0, 0.0],   # B
        [a,   a,   0.0],   # C
        [0.0, a,   0.0],   # D
        [cx,  cy,  h],     # S
    ]

    edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],   # đáy ABCD
        [0, 4], [1, 4], [2, 4], [3, 4],   # cạnh bên SA SB SC SD
    ]

    # Mặt: đáy ABCD + 4 tam giác bên
    faces = [
        [0, 1, 2, 3],   # đáy ABCD (tứ giác, winding CCW nhìn từ dưới)
        [0, 1, 4],       # tam giác SAB
        [1, 2, 4],       # tam giác SBC
        [2, 3, 4],       # tam giác SCD
        [3, 0, 4],       # tam giác SDA
    ]

    base_area   = a * a
    slant_h     = np.sqrt((a / 2) ** 2 + h ** 2)   # đường cao mặt bên
    lateral_area = 4 * 0.5 * a * slant_h
    surface_area = base_area + lateral_area
    volume       = (1.0 / 3.0) * base_area * h

    return {
        "vertices":      vertices,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": ["A", "B", "C", "D", "S"],
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surface_area, 4),
            "height":        round(h, 4),
            "base_size":     round(a, 4),
            "base_area":     round(base_area, 4),
            "slant_height":  round(slant_h, 4),
        },
        "shape_type": "pyramid_square",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. Hình chóp tam giác đều S.ABC
# ─────────────────────────────────────────────────────────────────────────────

def _pyramid_triangle(params: Dict) -> Dict:
    a = float(params.get("base_size", 4.0))
    h = float(params.get("height", 5.0))
    sqrt3 = np.sqrt(3.0)

    # Đáy tam giác đều ABC đặt trên Oxy (z=0)
    #   A ở gốc toạ độ, B dọc theo Ox
    #   tâm ngoại tiếp (circumcenter) của tam giác đều ở (a/2, a/(2*sqrt3))
    cx = a / 2.0
    cy = a / (2.0 * sqrt3)   # tâm trọng tâm y

    vertices = [
        [0.0,  0.0,              0.0],   # A
        [a,    0.0,              0.0],   # B
        [cx,   a * sqrt3 / 2.0, 0.0],   # C (đỉnh tam giác)
        [cx,   cy,               h],    # S (thẳng đứng trên trọng tâm)
    ]

    edges = [
        [0, 1], [1, 2], [2, 0],   # đáy ABC
        [0, 3], [1, 3], [2, 3],   # cạnh bên SA SB SC
    ]

    faces = [
        [0, 1, 2],   # đáy ABC
        [0, 1, 3],   # SAB
        [1, 2, 3],   # SBC
        [2, 0, 3],   # SCA
    ]

    base_area     = (sqrt3 / 4.0) * a ** 2
    inradius      = a / (2.0 * sqrt3)                  # bán kính nội tiếp đáy
    slant_h       = np.sqrt(inradius ** 2 + h ** 2)    # đường cao mặt bên
    lateral_area  = 3.0 * 0.5 * a * slant_h
    surface_area  = base_area + lateral_area
    volume        = (1.0 / 3.0) * base_area * h

    return {
        "vertices":      vertices,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": ["A", "B", "C", "S"],
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surface_area, 4),
            "height":        round(h, 4),
            "base_size":     round(a, 4),
            "base_area":     round(base_area, 4),
            "slant_height":  round(slant_h, 4),
        },
        "shape_type": "pyramid_triangle",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Lăng trụ đứng đều n cạnh
# ─────────────────────────────────────────────────────────────────────────────

def _prism_regular(params: Dict) -> Dict:
    n   = int(params.get("n_sides", 6))
    r   = float(params.get("base_radius", 3.0))
    h   = float(params.get("height", 5.0))
    n   = max(3, min(n, 12))

    # Đỉnh đáy dưới (z=0), bắt đầu từ góc -90° để đỉnh đầu tiên ở phía trên
    bottom = []
    for i in range(n):
        θ = 2.0 * np.pi * i / n - np.pi / 2.0
        bottom.append([r * np.cos(θ), r * np.sin(θ), 0.0])

    top = [[p[0], p[1], h] for p in bottom]
    vertices = bottom + top

    # Nhãn: A₁…Aₙ (đáy dưới), B₁…Bₙ (đáy trên)
    base_labels = [f"A{i+1}" for i in range(n)]
    top_labels  = [f"B{i+1}" for i in range(n)]
    labels = base_labels + top_labels

    edges = []
    for i in range(n):
        edges.append([i, (i + 1) % n])           # cạnh đáy dưới
    for i in range(n):
        edges.append([n + i, n + (i + 1) % n])   # cạnh đáy trên
    for i in range(n):
        edges.append([i, n + i])                  # cạnh bên

    faces = []
    faces.append(list(range(n)))                  # đáy dưới
    faces.append(list(range(n, 2 * n))[::-1])     # đáy trên (winding ngược)
    for i in range(n):
        j = (i + 1) % n
        faces.append([i, j, n + j, n + i])       # mặt bên hình thang (= hình chữ nhật)

    side       = 2.0 * r * np.sin(np.pi / n)
    base_area  = 0.5 * n * r ** 2 * np.sin(2.0 * np.pi / n)
    lat_area   = n * side * h
    surf_area  = 2.0 * base_area + lat_area
    volume     = base_area * h

    return {
        "vertices":      vertices,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": labels,
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surf_area, 4),
            "height":        round(h, 4),
            "base_radius":   round(r, 4),
            "base_area":     round(base_area, 4),
            "n_sides":       n,
            "side_length":   round(side, 4),
        },
        "shape_type": "prism_regular",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Hình hộp chữ nhật (Cuboid)
# ─────────────────────────────────────────────────────────────────────────────

def _box(params: Dict) -> Dict:
    w = float(params.get("width",  4.0))
    d = float(params.get("depth",  3.0))
    h = float(params.get("height", 5.0))

    vertices = [
        [0.0, 0.0, 0.0],   # A
        [w,   0.0, 0.0],   # B
        [w,   d,   0.0],   # C
        [0.0, d,   0.0],   # D
        [0.0, 0.0, h],     # A'
        [w,   0.0, h],     # B'
        [w,   d,   h],     # C'
        [0.0, d,   h],     # D'
    ]

    edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],   # đáy dưới
        [4, 5], [5, 6], [6, 7], [7, 4],   # đáy trên
        [0, 4], [1, 5], [2, 6], [3, 7],   # cạnh đứng
    ]

    faces = [
        [0, 3, 2, 1],   # đáy dưới
        [4, 5, 6, 7],   # đáy trên
        [0, 1, 5, 4],   # mặt trước
        [2, 3, 7, 6],   # mặt sau
        [0, 4, 7, 3],   # mặt trái
        [1, 2, 6, 5],   # mặt phải
    ]

    volume      = w * d * h
    surface_area = 2.0 * (w * d + d * h + w * h)

    return {
        "vertices":      vertices,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": ["A", "B", "C", "D", "A'", "B'", "C'", "D'"],
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surface_area, 4),
            "width":         round(w, 4),
            "depth":         round(d, 4),
            "height":        round(h, 4),
        },
        "shape_type": "box",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. Hình nón tròn xoay
# ─────────────────────────────────────────────────────────────────────────────

def _cone(params: Dict) -> Dict:
    r        = float(params.get("radius",   3.0))
    h        = float(params.get("height",   5.0))
    segments = int(params.get("segments", 32))
    segments = max(8, min(segments, 64))

    # Đỉnh: S ở (0,0,h), đáy tròn ở z=0, tâm đáy O'(0,0,0)
    vertices = [[0.0, 0.0, h]]   # S – đỉnh nón
    for j in range(segments):
        θ = 2.0 * np.pi * j / segments
        vertices.append([r * np.cos(θ), r * np.sin(θ), 0.0])
    vertices.append([0.0, 0.0, 0.0])   # O' – tâm đáy

    apex   = 0
    center = len(vertices) - 1

    # Cạnh: chỉ cạnh giao tuyến đáy + đường sinh (đủ dùng cho cross-section)
    edges = []
    for j in range(segments):
        edges.append([1 + j, 1 + (j + 1) % segments])   # vành đáy
    for j in range(segments):
        edges.append([apex, 1 + j])                       # đường sinh

    faces = []
    for j in range(segments):
        b = 1 + j
        c = 1 + (j + 1) % segments
        faces.append([apex, b, c])           # mặt bên
        faces.append([center, c, b])         # đáy

    slant_h     = np.sqrt(r ** 2 + h ** 2)
    base_area   = np.pi * r ** 2
    lat_area    = np.pi * r * slant_h
    surf_area   = base_area + lat_area
    volume      = (1.0 / 3.0) * base_area * h

    return {
        "vertices":      vertices,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": ["S"],
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surf_area, 4),
            "radius":        round(r, 4),
            "height":        round(h, 4),
            "slant_height":  round(slant_h, 4),
            "base_area":     round(base_area, 4),
        },
        "shape_type": "cone",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. Hình cầu
# ─────────────────────────────────────────────────────────────────────────────

def _sphere(params: Dict) -> Dict:
    r        = float(params.get("radius", 3.0))
    segments = int(params.get("segments", 24))
    segments = max(8, min(segments, 48))
    rings    = segments // 2

    # UV sphere: đỉnh bắc ở (0,0,r), đỉnh nam ở (0,0,-r)
    verts = [[0.0, 0.0, r]]   # north pole

    for i in range(1, rings):
        φ = np.pi * i / rings
        for j in range(segments):
            θ = 2.0 * np.pi * j / segments
            verts.append([
                r * np.sin(φ) * np.cos(θ),
                r * np.sin(φ) * np.sin(θ),
                r * np.cos(φ),
            ])

    verts.append([0.0, 0.0, -r])   # south pole

    north = 0
    south = len(verts) - 1

    # Không liệt kê edges riêng (quá nhiều) – dùng faces để render
    edges = []

    faces = []
    # Chỏm bắc
    for j in range(segments):
        a = 1 + j
        b = 1 + (j + 1) % segments
        faces.append([north, a, b])

    # Dải giữa
    for i in range(rings - 2):
        for j in range(segments):
            a = 1 + i * segments + j
            b = 1 + i * segments + (j + 1) % segments
            c = 1 + (i + 1) * segments + (j + 1) % segments
            d = 1 + (i + 1) * segments + j
            faces.append([a, b, c, d])

    # Chỏm nam
    for j in range(segments):
        a = south - segments + j
        b = south - segments + (j + 1) % segments
        faces.append([south, b, a])

    volume      = (4.0 / 3.0) * np.pi * r ** 3
    surf_area   = 4.0 * np.pi * r ** 2

    return {
        "vertices":      verts,
        "edges":         edges,
        "faces":         faces,
        "vertex_labels": [],
        "properties": {
            "volume":        round(volume, 4),
            "surface_area":  round(surf_area, 4),
            "radius":        round(r, 4),
        },
        "shape_type": "sphere",
    }


# Gán dispatchers sau khi định nghĩa hàm
SHAPE_DISPATCHERS = {
    "pyramid_square":   _pyramid_square,
    "pyramid_triangle": _pyramid_triangle,
    "prism_regular":    _prism_regular,
    "box":              _box,
    "cone":             _cone,
    "sphere":           _sphere,
}
