import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import OxyzAxes from './OxyzAxes';
import SolidShape from './SolidShape';
import CrossSection from './CrossSection';
import GestureManager from './GestureManager';
import { useGeometryStore } from '../../store/useGeometryStore';

const Scene: React.FC = () => {
  const { showAxes } = useGeometryStore();

  return (
    <div className="canvas-container">
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
          
          <GestureManager>
            <SolidShape />
            <CrossSection />
          </GestureManager>

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
