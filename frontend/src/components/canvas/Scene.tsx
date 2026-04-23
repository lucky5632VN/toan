import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import OxyzAxes from './OxyzAxes';
import SolidShape from './SolidShape';
import CrossSection from './CrossSection';
import MouseDrawingOverlay from './MouseDrawingOverlay';

import { useGeometryStore } from '../../store/useGeometryStore';

const Scene: React.FC = () => {
  const { showAxes, isDrawingMode } = useGeometryStore();

  return (
    <div className="canvas-container">
      {isDrawingMode && (
        <div style={{
          position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', color: '#7ee787', border: '1px solid #7ee787',
          padding: '0.6rem 1.2rem', borderRadius: '30px', fontWeight: 600, fontSize: '0.85rem',
          whiteSpace: 'nowrap', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          ✨ Giữ phím SHIFT + Kéo chuột trái để vẽ
        </div>
      )}
      
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[10, -15, 12]} up={[0, 0, 1]} fov={50} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.1} />
          
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, -10, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />
          
          {showAxes && <OxyzAxes />}
          
          <SolidShape />
          <CrossSection />
          <MouseDrawingOverlay />

          <ContactShadows 
            position={[0, 0, 0]} 
            rotation={[-Math.PI / 2, 0, 0]} 
            opacity={0.4} 
            scale={20} 
            blur={2} 
            far={4.5} 
          />
          
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      
      <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', color: '#8b949e', fontSize: '0.7rem' }}>
        Chuột trái: Xoay | Chuột phải: Di chuyển | Cuộn: Phóng to
      </div>
    </div>
  );
};

export default Scene;
