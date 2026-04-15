"""
Thuật toán tính thiết diện (cross-section) của khối đa diện.
Sử dụng phép tính giao điểm cạnh – mặt phẳng (plane-edge intersection).
Hệ tọa độ z-up (chuẩn toán học).
"""
import numpy as np
from typing import List, Dict, Optional


# ─────────────────────────────────────────────────────────────────────────────
# API chính
# ─────────────────────────────────────────────────────────────────────────────

def compute_cross_section(
    vertices: List[List[float]],
    edges: List[List[int]],
    plane_normal: List[float],
    plane_point: List[float],
) -> Dict:
    """
    Tính thiết diện của khối đa diện với mặt phẳng π.

    Phương trình mặt phẳng: n⃗ · (r - P₀) = 0
      ↔  n⃗ · r = n⃗ · P₀  (d = const)

    Thuật toán:
      1. Với mỗi cạnh, tính giao điểm tham số t.
      2. Loại bỏ điểm trùng.
      3. Sắp xếp theo thứ tự góc convex quanh tâm.
      4. Tính diện tích + chu vi.
    """
    verts = np.array(vertices, dtype=np.float64)
    n_vec = np.array(plane_normal, dtype=np.float64)
    p0    = np.array(plane_point,  dtype=np.float64)

    # Chuẩn hóa vector pháp tuyến
    n_len = np.linalg.norm(n_vec)
    if n_len < 1e-12:
        return _empty_result("Vector pháp tuyến gần bằng 0")

    n_vec = n_vec / n_len
    d = np.dot(n_vec, p0)

    # Giá trị signed distance của mỗi đỉnh đến mặt phẳng
    side = verts @ n_vec - d   # shape (num_verts,)

    # Giao điểm trên các cạnh
    pts: List[np.ndarray] = []

    for edge in edges:
        i, j = int(edge[0]), int(edge[1])
        si, sj = float(side[i]), float(side[j])

        if si * sj < 0:
            # Cạnh cắt mặt phẳng
            t  = si / (si - sj)
            pt = verts[i] + t * (verts[j] - verts[i])
            pts.append(pt)
        elif abs(si) < 1e-8:
            pts.append(verts[i].copy())
        elif abs(sj) < 1e-8:
            pts.append(verts[j].copy())

    if len(pts) < 3:
        return _empty_result("Mặt phẳng không cắt hình khối (hoặc cắt tại 1 điểm/cạnh)")

    # Loại bỏ điểm trùng
    pts = _deduplicate(pts, tol=1e-6)
    if len(pts) < 3:
        return _empty_result("Sau loại trùng, không đủ 3 đỉnh để tạo đa giác")

    # Sắp xếp thứ tự convex
    pts_sorted = _sort_polygon_3d(pts, n_vec)

    # Tính diện tích và chu vi
    area      = _polygon_area_3d(pts_sorted)
    perimeter = _polygon_perimeter(pts_sorted)
    name      = _classify_polygon(len(pts_sorted))

    return {
        "polygon_vertices": [p.tolist() for p in pts_sorted],
        "area":             round(float(area), 6),
        "perimeter":        round(float(perimeter), 6),
        "shape_name":       name,
        "num_vertices":     len(pts_sorted),
        "error":            None,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Hàm hỗ trợ
# ─────────────────────────────────────────────────────────────────────────────

def _empty_result(msg: str) -> Dict:
    return {
        "polygon_vertices": [],
        "area":             0.0,
        "perimeter":        0.0,
        "shape_name":       "Không có thiết diện",
        "num_vertices":     0,
        "error":            msg,
    }


def _deduplicate(pts: List[np.ndarray], tol: float = 1e-6) -> List[np.ndarray]:
    """Loại bỏ các điểm trùng nhau trong khoảng tolerance."""
    unique: List[np.ndarray] = []
    for p in pts:
        is_dup = any(np.linalg.norm(p - q) < tol for q in unique)
        if not is_dup:
            unique.append(p)
    return unique


def _sort_polygon_3d(pts: List[np.ndarray], normal: np.ndarray) -> List[np.ndarray]:
    """
    Sắp xếp các điểm thành đa giác convex bằng cách chiếu lên mặt phẳng cục bộ 2D
    và sắp xếp theo góc (angular sort).
    """
    centroid = np.mean(pts, axis=0)

    # Tạo hệ tọa độ cục bộ trên mặt phẳng (u, v)
    arbitrary = np.array([1.0, 0.0, 0.0])
    if abs(np.dot(normal, arbitrary)) > 0.9:
        arbitrary = np.array([0.0, 1.0, 0.0])

    u = np.cross(normal, arbitrary)
    u = u / np.linalg.norm(u)
    v = np.cross(normal, u)
    v = v / np.linalg.norm(v)

    # Tính góc của mỗi điểm so với tâm
    def angle_of(p: np.ndarray) -> float:
        diff = p - centroid
        return float(np.arctan2(np.dot(diff, v), np.dot(diff, u)))

    return sorted(pts, key=angle_of)


def _polygon_area_3d(pts: List[np.ndarray]) -> float:
    """Tính diện tích đa giác 3D bằng phương pháp cross-product (Shoelace 3D)."""
    if len(pts) < 3:
        return 0.0
    area_vec = np.zeros(3)
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        area_vec += np.cross(pts[i], pts[j])
    return 0.5 * float(np.linalg.norm(area_vec))


def _polygon_perimeter(pts: List[np.ndarray]) -> float:
    """Tính chu vi đa giác 3D."""
    total = 0.0
    n = len(pts)
    for i in range(n):
        total += float(np.linalg.norm(pts[(i + 1) % n] - pts[i]))
    return total


def _classify_polygon(n: int) -> str:
    """Phân loại đa giác theo số cạnh (tiếng Việt)."""
    names = {
        3: "Tam giác",
        4: "Tứ giác",
        5: "Ngũ giác",
        6: "Lục giác",
        7: "Thất giác",
        8: "Bát giác",
    }
    return names.get(n, f"Đa giác {n} cạnh")
