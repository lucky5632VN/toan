import type { ShapeConfig } from '../types/geometry';

export const SHAPE_CONFIGS: ShapeConfig[] = [
  {
    id: 'pyramid_square',
    label: 'Chóp Tứ Giác Đều',
    defaultParams: { base_size: 4, height: 5 }
  },
  {
    id: 'pyramid_triangle',
    label: 'Chóp Tam Giác Đều',
    defaultParams: { base_size: 4, height: 5 }
  },
  {
    id: 'prism_regular',
    label: 'Lăng Trụ Đứng Đều',
    defaultParams: { n_sides: 6, base_radius: 3, height: 5 }
  },
  {
    id: 'box',
    label: 'Hình Hộp Chữ Nhật',
    defaultParams: { width: 4, depth: 3, height: 5 }
  },
  {
    id: 'cone',
    label: 'Hình Nón',
    defaultParams: { radius: 3, height: 5 }
  },
  {
    id: 'sphere',
    label: 'Hình Cầu',
    defaultParams: { radius: 3 }
  }
];
