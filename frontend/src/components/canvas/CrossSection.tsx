import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGeometryStore } from '../../store/useGeometryStore';
import { Line } from '@react-three/drei';

const CrossSection: React.FC = () => {
  const { crossSection, crossSectionColor } = useGeometryStore();

  const geometry = useMemo(() => {
    if (!crossSection || crossSection.polygon_vertices.length < 3) return null;

    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    
    // Triangulate the convex polygon (fan triangulation)
    const v0 = crossSection.polygon_vertices[0];
    for (let i = 1; i < crossSection.polygon_vertices.length - 1; i++) {
      const v1 = crossSection.polygon_vertices[i];
      const v2 = crossSection.polygon_vertices[i+1];
      vertices.push(...v0, ...v1, ...v2);
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.computeVertexNormals();
    return geo;
  }, [crossSection]);

  if (!crossSection || !geometry) return null;

  // Points for the outline
  const outlinePoints = [...crossSection.polygon_vertices, crossSection.polygon_vertices[0]] as [number, number, number][];

  return (
    <group>
      {/* Polygon Surface */}
      <mesh geometry={geometry}>
        <meshBasicMaterial 
          color={crossSectionColor} 
          transparent 
          opacity={0.8} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Polygon Outline */}
      <Line
        points={outlinePoints}
        color="#fbc02d"
        lineWidth={3}
      />

      {/* Highlight Vertices */}
      {crossSection.polygon_vertices.map((v, idx) => (
        <mesh key={`p-v-${idx}`} position={v as [number, number, number]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
};

export default CrossSection;
