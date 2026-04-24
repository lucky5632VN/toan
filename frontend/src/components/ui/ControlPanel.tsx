import React, { useState } from 'react';
import { Box, Eye, PenTool, MousePointer2, Trash2 } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import { SHAPE_CONFIGS } from '../../config/shapes';
import { CustomShapeBuilder } from './CustomShapeBuilder';
import { useControls, folder } from 'leva';

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
    toggleWireframe,
    isDrawingMode,
    setDrawingMode,
    clearDrawingPoints,
    setShapeData
  } = useGeometryStore();

  const [showBuilder, setShowBuilder] = useState(false);

  // Auto-render Leva when shape changes
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
  }, [selectedShape]);

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
        style={{ marginBottom: '0.8rem' }}
      >
        {SHAPE_CONFIGS.map(shape => (
          <option key={shape.id} value={shape.id}>{shape.label}</option>
        ))}
        <option value="custom">Hệ Khối Tuỳ Chỉnh (Lõi Toán)...</option>
      </select>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button 
          onClick={() => {
            const newMode = !isDrawingMode;
            setDrawingMode(newMode);
            if (newMode) {
              setSelectedShape('custom');
              clearDrawingPoints();
            }
          }} 
          style={{
            padding: '0.6rem', 
            background: isDrawingMode ? 'rgba(88,166,255,0.2)' : 'rgba(255,255,255,0.05)', 
            color: isDrawingMode ? '#58a6ff' : '#c9d1d9',
            border: isDrawingMode ? '1px solid #58a6ff' : '1px solid #30363d', 
            borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8rem'
          }}
        >
          <MousePointer2 size={14} /> {isDrawingMode ? 'Đang Vẽ Chuột...' : 'Vẽ Hình Bằng Chuột'}
        </button>

        {selectedShape === 'custom' && !isDrawingMode && (
          <button 
            onClick={() => setShowBuilder(true)} 
            style={{
              padding: '0.6rem', background: 'rgba(88,166,255,0.1)', color: '#58a6ff',
              border: '1px dashed #58a6ff', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8rem'
            }}
          >
            <PenTool size={14} /> Điền Lưới Ma Trận
          </button>
        )}
      </div>

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

      <button 
        onClick={() => {
          setSelectedShape('none');
          setShapeData(null as any);
          clearDrawingPoints();
        }}
        style={{
          marginTop: '1.5rem',
          padding: '0.6rem', background: 'rgba(248, 81, 73, 0.1)', color: '#f85149',
          border: '1px solid rgba(248, 81, 73, 0.2)', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.8rem',
          width: '100%'
        }}
      >
        <Trash2 size={14} /> Xoá Toàn Bộ Canvas
      </button>
    </div>
  );
};

export default ControlPanel;
