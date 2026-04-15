import React from 'react';
import { useFrame } from '@react-three/fiber';
import { useGestureStore } from '../../store/useGestureStore';

interface GestureManagerProps {
  children: React.ReactNode;
}

const GestureManager: React.FC<GestureManagerProps> = ({ children }) => {
  const { rotationX, rotationY, rotationZ, isEnabled } = useGestureStore();
  const groupRef = React.useRef<any>(null);

  useFrame(() => {
    if (groupRef.current && isEnabled) {
      // Smoothly interpolate towards the gesture-defined rotation
      groupRef.current.rotation.x = rotationX;
      groupRef.current.rotation.y = rotationY;
      groupRef.current.rotation.z = rotationZ;
    }
  });

  return (
    <group ref={groupRef}>
      {children}
    </group>
  );
};

export default GestureManager;
