import { create } from 'zustand';

interface GestureState {
  isEnabled: boolean;
  isDetected: boolean;
  
  // Rotation offsets derived from hand movement
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  
  // Last tracked position for delta calculation
  lastX: number | null;
  lastY: number | null;
  
  // Actions
  setEnabled: (enabled: boolean) => void;
  setDetected: (detected: boolean) => void;
  updateRotation: (dx: number, dy: number) => void;
  resetRotation: () => void;
  setLastPosition: (x: number | null, y: number | null) => void;
}

export const useGestureStore = create<GestureState>((set) => ({
  isEnabled: false,
  isDetected: false,
  
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  
  lastX: null,
  lastY: null,

  setEnabled: (enabled) => set({ isEnabled: enabled }),
  setDetected: (detected) => set({ isDetected: detected }),
  
  updateRotation: (dx, dy) => set((state) => ({
    rotationX: state.rotationX + dy * 0.015, // Sensitivity
    rotationZ: state.rotationZ + dx * 0.015,
  })),
  
  resetRotation: () => set({ rotationX: 0, rotationY: 0, rotationZ: 0 }),
  
  setLastPosition: (x, y) => set({ lastX: x, lastY: y }),
}));
