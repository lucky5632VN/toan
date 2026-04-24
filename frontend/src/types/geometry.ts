export interface ShapeParams {
  base_size?: number;
  height?: number;
  n_sides?: number;
  base_radius?: number;
  width?: number;
  depth?: number;
  radius?: number;
}

export interface ShapeData {
  vertices: number[][];
  edges: number[][];
  faces: number[][];
  vertex_labels: string[];
  properties: Record<string, any>;
  shape_type: string;
}

export interface PlaneDefinition {
  normal: [number, number, number];
  point: [number, number, number];
}

export interface CrossSectionData {
  polygon_vertices: number[][];
  area: number;
  perimeter: number;
  shape_name: string;
  num_vertices: number;
  error?: string | null;
}

export type ShapeType = 
  | 'pyramid_square' 
  | 'pyramid_triangle' 
  | 'prism_regular' 
  | 'box' 
  | 'cone' 
  | 'sphere'
  | 'custom'
  | 'none';

export interface ShapeConfig {
  id: ShapeType;
  label: string;
  defaultParams: ShapeParams;
}
