import React, { useState, useEffect } from 'react';
import { Box, Eye, PenTool } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import { SHAPE_CONFIGS } from '../../config/shapes';
import { CustomShapeBuilder } from './CustomShapeBuilder';
import { useControls, button, folder } from 'leva';

const ControlPanel: React.FC = () => {
  const { 
    selectedShape, 
    setSelectedShape, 
    shapeParams, 
    updateParams,
    showAxes,
    toggleAxes,
    showLabels,
    toggleLabels,
    opacity,
    setOpacity,
    wireframe,
    toggleWireframe
  } = useGeometryStore();

  const [showBuilder, setShowBuilder] = useState(false);

  // Tự động re-render Leva khi chọn khối khác
  useControls(() => {
    if (selectedShape === 'custom') return {} as any;

    const controls: any = {};

    if (selectedShape === 'prism_regular') {
      controls.n_sides = { value: shapeParams.n_sides || 6, min: 3, max: 12, step: 1, label: 'Số cạnh đáy', onChange: (v: number) => updateParams({ n_sides: v }) };
    }

    if (selectedShape === 'pyramid_square' || selectedShape === 'pyramid_triangle') {
      controls.base_size = { value: shapeParams.base_size || 4, min: 1, max: 10, step: 0.5, label: 'Cạnh đáy', onChange: (v: number) => updateParams({ base_size: v }) };
    }

    if (selectedShape !== 'sphere') {
      controls.height = { value: shapeParams.height || 5, min: 1, max: 15, step: 0.5, label: 'Chiều cao (h)', onChange: (v: number) => updateParams({ height: v }) };
    }

    if (selectedShape === 'box') {
      controls.width = { value: shapeParams.width || 4, min: 1, max: 10, step: 0.5, label: 'Chiều rộng (w)', onChange: (v: number) => updateParams({ width: v }) };
      controls.depth = { value: shapeParams.depth || 3, min: 1, max: 10, step: 0.5, label: 'Chiều sâu (d)', onChange: (v: number) => updateParams({ depth: v }) };
    }

    if (selectedShape === 'cone' || selectedShape === 'sphere' || selectedShape === 'prism_regular') {
      const isPrism = selectedShape === 'prism_regular';
      controls.radius = { 
        value: shapeParams.radius || shapeParams.base_radius || 3, 
        min: 1, max: 8, step: 0.5, 
        label: 'Bán kính (r)', 
        onChange: (v: number) => updateParams(isPrism ? { base_radius: v } : { radius: v }) 
      };
    }

    return {
      'Tham Số Hình Học': folder(controls)
    } as any;
  }, [selectedShape]); // <-- Dependencies để reload khi đổi loại hình

  return (
    <div className="sidebar sidebar-left glass">
      <div className="panel-header">
        <Box size={18} />
        Chọn Hình Khối
      </div>

      <select 
        value={selectedShape} 
        onChange={(e) => {
          const type = e.target.value as any;
          setSelectedShape(type);
          if (type !== 'custom') {
            const config = SHAPE_CONFIGS.find(s => s.id === type);
            if (config) updateParams(config.defaultParams);
          }
        }}
      >
        {SHAPE_CONFIGS.map(shape => (
          <option key={shape.id} value={shape.id}>{shape.label}</option>
        ))}
        <option value="custom">Hệ Khối Tuỳ Chỉnh (Lõi Toán)...</option>
      </select>

      {selectedShape === 'custom' && (
        <button 
          onClick={() => setShowBuilder(true)} 
          style={{
            marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(88,166,255,0.1)', color: '#58a6ff',
            border: '1px dashed #58a6ff', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8rem'
          }}
        >
          <PenTool size={14} /> Điền Lưới Ma Trận bằng tay
        </button>
      )}

      {/* Đã chuyển Tham Số Hình Học sang Leva Panel (Góc phải màn hình) */}

      <div className="panel-header" style={{ marginTop: '1.5rem' }}>
        <Eye size={18} />
        Trực Quan Biểu Diễn
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAxes} onChange={toggleAxes} />
          Hệ trục tọa độ Oxyz
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={showLabels} onChange={toggleLabels} />
          Nhãn đỉnh
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={wireframe} onChange={toggleWireframe} />
          Khung dây (Wireframe)
        </label>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: '#c9d1d9' }}>Độ trong suốt</span>
          <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>{Math.round(opacity * 100)}%</span>
        </div>
        <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} style={{ margin: 0 }} />
      </div>

      {showBuilder && <CustomShapeBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  );
};

export default ControlPanel;

