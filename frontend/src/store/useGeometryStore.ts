import { create } from 'zustand';
import type { 
  ShapeType, 
  ShapeParams, 
  ShapeData, 
  PlaneDefinition, 
  CrossSectionData 
} from '../types/geometry';

interface GeometryState {
  // Shape State
  selectedShape: ShapeType;
  shapeParams: ShapeParams;
  shapeData: ShapeData | null;
  isLoading: boolean;
  error: string | null;

  // Plane State
  plane: PlaneDefinition;
  crossSection: CrossSectionData | null;
  crossSectionColor: string;
  isComputingSection: boolean;

  // UI State
  showAxes: boolean;
  showLabels: boolean;
  opacity: number;
  wireframe: boolean;

  // Actions
  setSelectedShape: (type: ShapeType) => void;
  updateParams: (params: Partial<ShapeParams>) => void;
  setShapeData: (data: ShapeData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  setPlane: (plane: Partial<PlaneDefinition>) => void;
  setCrossSection: (data: CrossSectionData | null) => void;
  setCrossSectionColor: (color: string) => void;
  setComputingSection: (computing: boolean) => void;
  
  toggleAxes: () => void;
  toggleLabels: () => void;
  setOpacity: (opacity: number) => void;
  toggleWireframe: () => void;
}

export const useGeometryStore = create<GeometryState>((set) => ({
  // Default State
  selectedShape: 'pyramid_square',
  shapeParams: { base_size: 4, height: 5 },
  shapeData: null,
  isLoading: false,
  error: null,

  plane: {
    normal: [0, 0, 1],
    point: [0, 0, 2.5]
  },
  crossSection: null,
  crossSectionColor: '#ffeb3b',
  isComputingSection: false,

  showAxes: true,
  showLabels: true,
  opacity: 0.6,
  wireframe: false,

  // Actions
  setSelectedShape: (type) => set({ selectedShape: type }),
  updateParams: (newParams) => set((state) => ({ 
    shapeParams: { ...state.shapeParams, ...newParams } 
  })),
  setShapeData: (data) => set({ shapeData: data }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setPlane: (newPlane) => set((state) => ({ 
    plane: { ...state.plane, ...newPlane } 
  })),
  setCrossSection: (data) => set({ crossSection: data }),
  setCrossSectionColor: (color) => set({ crossSectionColor: color }),
  setComputingSection: (computing) => set({ isComputingSection: computing }),

  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  setOpacity: (opacity) => set({ opacity }),
  toggleWireframe: () => set((state) => ({ wireframe: !state.wireframe }))
}));
