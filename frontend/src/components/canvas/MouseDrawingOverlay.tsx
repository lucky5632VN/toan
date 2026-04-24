import React, { useState } from 'react';
import { useGeometryStore } from '../../store/useGeometryStore';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';

const MouseDrawingOverlay: React.FC = () => {
  const { 
    isDrawingMode, 
    drawingPoints, 
    addDrawingPoint, 
    undoDrawingPoint,
    clearDrawingPoints,
    setShapeData, 
    setDrawingMode, 
    setSelectedShape 
  } = useGeometryStore();
  const [isDragging, setIsDragging] = useState(false);

  if (!isDrawingMode) return null;

  const handlePointerDown = (e: any) => {
    // Chỉ vẽ khi bấm chuột trái (button === 0) và giữ phím Shift
    if (e.button !== 0 || !e.shiftKey) return;
    
    e.stopPropagation();
    setIsDragging(true);
    const point: [number, number, number] = [e.point.x, e.point.y, 0];
    addDrawingPoint(point);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: any) => {
    if (!isDragging) return;
    e.stopPropagation();
    const point: [number, number, number] = [e.point.x, e.point.y, 0];
    
    // Giới hạn khoảng cách giữa các điểm để tránh tạo ra quá nhiều điểm
    if (drawingPoints.length > 0) {
      const lastPt = drawingPoints[drawingPoints.length - 1];
      const distSq = (point[0] - lastPt[0]) ** 2 + (point[1] - lastPt[1]) ** 2;
      if (distSq < 0.25) return;
    }
    addDrawingPoint(point);
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setIsDragging(false);
    e.target.releasePointerCapture(e.pointerId);
  };

  const finalizeShape = () => {
    if (drawingPoints.length < 3) return;

    const N = drawingPoints.length;
    const height = 5;
    const vertices: number[][] = [];
    const edges: number[][] = [];
    const faces: number[][] = [];

    // Sinh các đỉnh đáy (z=0) và đỉnh trên (z=height)
    for (let i = 0; i < N; i++) vertices.push([drawingPoints[i][0], drawingPoints[i][1], 0]);
    for (let i = 0; i < N; i++) vertices.push([drawingPoints[i][0], drawingPoints[i][1], height]);

    // Nội suy bề mặt đáy và mặt nắp bằng ShapeUtils (Hỗ trợ đa giác lõm)
    const contour2D = drawingPoints.map(p => new THREE.Vector2(p[0], p[1]));
    let triangles: number[][] = [];
    try {
      triangles = THREE.ShapeUtils.triangulateShape(contour2D, []);
    } catch (e) {
      console.error("Lỗi khi chia lưới mặt:", e);
      for(let i=1; i<N-1; i++) triangles.push([0, i, i+1]); // Fallback
    }

    for (const tri of triangles) {
      faces.push([tri[2], tri[1], tri[0]]); // Mặt đáy quay xuống
      faces.push([tri[0] + N, tri[1] + N, tri[2] + N]); // Mặt nắp quay lên
    }

    // Khai báo các mặt bên và bộ khung dây (edges)
    for (let i = 0; i < N; i++) {
      const nextI = (i + 1) % N;
      faces.push([i, nextI, nextI + N, i + N]); // Mặt bên
      
      edges.push([i, nextI]); // Cạnh đáy
      edges.push([N + i, N + nextI]); // Cạnh trên
      edges.push([i, N + i]); // Cạnh đứng
    }

    setSelectedShape('custom');
    setShapeData({
      vertices,
      edges,
      faces,
      vertex_labels: vertices.map((_, i) => `P${i}`),
      shape_type: 'custom',
      properties: { custom: true, total_vertices: vertices.length, note: 'Khối tạo từ nét vẽ chuột' }
    });

    setDrawingMode(false);
  };

  return (
    <group>
      {/* Invisible plane to capture clicks */}
      <mesh 
        position={[0, 0, 0]} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Visualizing points */}
      {drawingPoints.map((p, i) => (
        <mesh key={`draw-p-${i}`} position={p}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#58a6ff" />
        </mesh>
      ))}

      {/* Visualizing lines */}
      {drawingPoints.length > 1 && (
        <Line 
          points={drawingPoints} 
          color="#58a6ff" 
          lineWidth={2} 
        />
      )}

      {/* Finalize UI */}
      {drawingPoints.length > 0 && (
        <Html position={[0, 0, 5]} center>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ 
              background: 'rgba(35, 134, 54, 0.9)', color: 'white', 
              padding: '0.5rem 1rem', borderRadius: '8px', 
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: drawingPoints.length >= 3 ? 'block' : 'none'
            }}
            onClick={finalizeShape}>
              Xác nhận tạo hình ({drawingPoints.length} điểm)
            </div>

            <div style={{ 
              background: 'rgba(255, 166, 87, 0.9)', color: 'white', 
              padding: '0.5rem 1rem', borderRadius: '8px', 
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            onClick={() => undoDrawingPoint()}>
              Hoàn tác
            </div>

            <div style={{ 
              background: 'rgba(248, 81, 73, 0.9)', color: 'white', 
              padding: '0.5rem 1rem', borderRadius: '8px', 
              cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
              whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
            onClick={() => clearDrawingPoints()}>
              Xoá hết
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

export default MouseDrawingOverlay;
