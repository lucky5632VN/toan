import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Line } from '@react-three/drei';
import { useGeometryStore } from '../../store/useGeometryStore';

const SolidShape: React.FC = () => {
  const { shapeData, opacity, wireframe, showLabels } = useGeometryStore();

  const geometry = useMemo(() => {
    if (!shapeData || !shapeData.vertices || shapeData.vertices.length === 0) {
      console.warn('SolidShape: Không có dữ liệu đỉnh');
      return null;
    }

    try {
      const geo = new THREE.BufferGeometry();
      
      // Flatten faces for BufferGeometry
      const vertices: number[] = [];
      shapeData.faces.forEach((face, fIdx) => {
        if (face.length < 3) return;
        
        // Triangulate faces (simple fan triangulation for convex faces)
        for (let i = 1; i < face.length - 1; i++) {
          const v0 = shapeData.vertices[face[0]];
          const v1 = shapeData.vertices[face[i]];
          const v2 = shapeData.vertices[face[i+1]];
          
          if (!v0 || !v1 || !v2) {
            console.error(`SolidShape: Lỗi chỉ số đỉnh ở mặt ${fIdx}`);
            continue;
          }
          vertices.push(...v0, ...v1, ...v2);
        }
      });

      if (vertices.length === 0) return null;

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      return geo;
    } catch (err) {
      console.error('SolidShape: Lỗi khi tạo BufferGeometry', err);
      return null;
    }
  }, [shapeData]);

  if (!shapeData || !geometry) return null;

  return (
    <group>
      {/* Khối chính */}
      <mesh geometry={geometry}>
        <meshPhongMaterial 
          color="#58a6ff" 
          transparent={opacity < 1} 
          opacity={opacity} 
          side={THREE.DoubleSide}
          wireframe={wireframe}
          specular={new THREE.Color("#ffffff")}
          shininess={50}
        />
      </mesh>

      {/* Cạnh / Đường viền */}
      {!wireframe && shapeData.edges && shapeData.edges.map((edge, idx) => {
        const v1 = shapeData.vertices[edge[0]];
        const v2 = shapeData.vertices[edge[1]];
        if (!v1 || !v2) return null;
        
        return (
          <Line
            key={`edge-${idx}`}
            points={[v1, v2] as [number, number, number][]}
            color="#ffffff"
            lineWidth={1}
            transparent
            opacity={0.3}
          />
        );
      })}

      {/* Nhãn đỉnh */}
      {showLabels && shapeData.vertices.map((v, idx) => {
        if (!v || v.length < 3) return null;
        const label = shapeData.vertex_labels && shapeData.vertex_labels[idx] ? shapeData.vertex_labels[idx] : null;
        if (!label) return null;
        return (
          <Text
            key={`label-${idx}`}
            position={[v[0] * 1.05, v[1] * 1.05, v[2] * 1.05] as [number, number, number]}
            fontSize={0.35}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
};

export default SolidShape;
