import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  currentTab: 'geometry' | 'graphing' | 'theory' | 'quiz';
  showAxes: boolean;
  showLabels: boolean;
  opacity: number;
  wireframe: boolean;
  isDrawingMode: boolean;
  drawingPoints: [number, number, number][];

  // Graphing State
  expressions: Array<{
    id: string;
    formula: string;
    color: string;
    visible: boolean;
  }>;
  graphVariables: Record<string, number>;
  x0: number; // For tangent line exploration
  isGeneratorOpen: boolean;

  // Actions
  setIsGeneratorOpen: (open: boolean) => void;
  setSelectedShape: (type: ShapeType) => void;
  updateParams: (params: Partial<ShapeParams>) => void;
  setShapeData: (data: ShapeData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  setPlane: (plane: Partial<PlaneDefinition>) => void;
  setCrossSection: (data: CrossSectionData | null) => void;
  setCrossSectionColor: (color: string) => void;
  setComputingSection: (computing: boolean) => void;
  
  setTab: (tab: 'geometry' | 'graphing' | 'theory' | 'quiz') => void;
  toggleAxes: () => void;
  toggleLabels: () => void;
  setOpacity: (opacity: number) => void;
  toggleWireframe: () => void;
  setDrawingMode: (mode: boolean) => void;
  addDrawingPoint: (point: [number, number, number]) => void;
  undoDrawingPoint: () => void;
  clearDrawingPoints: () => void;
  
  // Graphing Actions
  addExpression: (formula?: string) => void;
  removeExpression: (id: string) => void;
  updateExpression: (id: string, updates: any) => void;
  setExpressions: (exps: any[]) => void;
  updateVariable: (name: string, val: number) => void;
  setX0: (val: number) => void;
}

export const useGeometryStore = create<GeometryState>()(
  persist(
    (set) => ({
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

      currentTab: 'geometry',
      showAxes: true,
      showLabels: true,
      opacity: 0.6,
      wireframe: false,
      isDrawingMode: false,
      drawingPoints: [],

      expressions: [
        { id: '1', formula: 'x^2', color: '#58a6ff', visible: true },
        { id: '2', formula: 'sin(x)', color: '#ff7b72', visible: true }
      ],
      graphVariables: { a: 1, b: 0, c: 0 },
      x0: 0,
      isGeneratorOpen: false,

      // Actions
      setIsGeneratorOpen: (open) => set({ isGeneratorOpen: open }),
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

      setTab: (tab) => set({ currentTab: tab }),
      toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),
      toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
      setOpacity: (opacity) => set({ opacity }),
      toggleWireframe: () => set((state) => ({ wireframe: !state.wireframe })),
      setDrawingMode: (mode) => set({ isDrawingMode: mode }),
      addDrawingPoint: (point) => set((state) => ({ 
        drawingPoints: [...state.drawingPoints, point] 
      })),
      undoDrawingPoint: () => set((state) => ({
        drawingPoints: state.drawingPoints.slice(0, -1)
      })),
      clearDrawingPoints: () => set({ drawingPoints: [] }),

      addExpression: (formula = '') => set((state) => ({
        expressions: [
          ...state.expressions, 
          { 
            id: Math.random().toString(36).substr(2, 9), 
            formula, 
            color: ['#58a6ff', '#ff7b72', '#7ee787', '#d2a8ff', '#ffa657'][state.expressions.length % 5], 
            visible: true 
          }
        ]
      })),
      removeExpression: (id) => set((state) => ({
        expressions: state.expressions.filter(e => e.id !== id)
      })),
      updateExpression: (id, updates) => set((state) => ({
        expressions: state.expressions.map(e => e.id === id ? { ...e, ...updates } : e)
      })),
      setExpressions: (exps) => set({ expressions: exps }),
      updateVariable: (name, val) => set((state) => ({
        graphVariables: { ...state.graphVariables, [name]: val }
      })),
      setX0: (val) => set({ x0: val }),
    }),
    {
      name: 'spatial-mind-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        selectedShape: state.selectedShape,
        shapeParams: state.shapeParams,
        shapeData: state.shapeData,
        drawingPoints: state.drawingPoints,
        expressions: state.expressions,
        graphVariables: state.graphVariables,
        showAxes: state.showAxes,
        showLabels: state.showLabels,
        opacity: state.opacity,
        wireframe: state.wireframe,
        isGeneratorOpen: state.isGeneratorOpen
      }),
    }
  )
);
