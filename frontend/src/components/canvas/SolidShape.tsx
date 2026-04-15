import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Text, Line } from '@react-three/drei';
import { useGeometryStore } from '../../store/useGeometryStore';

const SolidShape: React.FC = () => {
  const { shapeData, opacity, wireframe, showLabels } = useGeometryStore();

  const geometry = useMemo(() => {
    if (!shapeData) return null;

    const geo = new THREE.BufferGeometry();
    
    // Flatten faces for BufferGeometry
    const vertices: number[] = [];
    shapeData.faces.forEach(face => {
      // Triangulate faces (simple fan triangulation for convex faces)
      for (let i = 1; i < face.length - 1; i++) {
        const v0 = shapeData.vertices[face[0]];
        const v1 = shapeData.vertices[face[i]];
        const v2 = shapeData.vertices[face[i+1]];
        vertices.push(...v0, ...v1, ...v2);
      }
    });

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, [shapeData]);

  if (!shapeData || !geometry) return null;

  return (
    <group>
      {/* Main Mesh */}
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

      {/* Edges / Outlines */}
      {!wireframe && shapeData.edges.map((edge, idx) => (
        <Line
          key={`edge-${idx}`}
          points={[shapeData.vertices[edge[0]], shapeData.vertices[edge[1]]] as [number, number, number][]}
          color="#ffffff"
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}

      {/* Vertex Labels */}
      {showLabels && shapeData.vertices.map((v, idx) => {
        const label = shapeData.vertex_labels[idx];
        if (!label) return null;
        return (
          <Text
            key={`label-${idx}`}
            position={[v[0] + 0.2, v[1] + 0.2, v[2] + 0.2]}
            fontSize={0.3}
            color="#ffffff"
          >
            {label}
          </Text>
        );
      })}
    </group>
  );
};

export default SolidShape;
