import React, { useState } from 'react';
import { Box, Settings, Eye, PenTool } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import { SHAPE_CONFIGS } from '../../config/shapes';
import { CustomShapeBuilder } from './CustomShapeBuilder';

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

      {selectedShape !== 'custom' && (
        <>
          <div className="panel-header" style={{ marginTop: '1rem' }}>
            <Settings size={18} />
            Tham Số Hình Học
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedShape === 'prism_regular' && (
              <div>
                <label>Số cạnh đáy ({shapeParams.n_sides})</label>
                <input 
                  type="range" min="3" max="12" 
                  value={shapeParams.n_sides || 6} 
                  onChange={(e) => updateParams({ n_sides: parseInt(e.target.value) })} 
                />
              </div>
            )}

            {(selectedShape === 'pyramid_square' || selectedShape === 'pyramid_triangle') && (
              <div>
                <label>Kích thước đáy ({shapeParams.base_size})</label>
                <input 
                  type="range" min="1" max="10" step="0.5"
                  value={shapeParams.base_size || 4} 
                  onChange={(e) => updateParams({ base_size: parseFloat(e.target.value) })} 
                />
              </div>
            )}

            {(selectedShape !== 'sphere') && (
              <div>
                <label>Chiều cao h ({shapeParams.height})</label>
                <input 
                  type="range" min="1" max="15" step="0.5"
                  value={shapeParams.height || 5} 
                  onChange={(e) => updateParams({ height: parseFloat(e.target.value) })} 
                />
              </div>
            )}

            {selectedShape === 'box' && (
              <>
                <div>
                  <label>Chiều rộng w ({shapeParams.width})</label>
                  <input type="range" min="1" max="10" step="0.5" value={shapeParams.width || 4} onChange={(e) => updateParams({ width: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label>Chiều sâu d ({shapeParams.depth})</label>
                  <input type="range" min="1" max="10" step="0.5" value={shapeParams.depth || 3} onChange={(e) => updateParams({ depth: parseFloat(e.target.value) })} />
                </div>
              </>
            )}

            {(selectedShape === 'cone' || selectedShape === 'sphere' || selectedShape === 'prism_regular') && (
              <div>
                <label>Bán kính r ({shapeParams.radius || shapeParams.base_radius})</label>
                <input 
                  type="range" min="1" max="8" step="0.5"
                  value={shapeParams.radius || shapeParams.base_radius || 3} 
                  onChange={(e) => updateParams(selectedShape === 'prism_regular' ? { base_radius: parseFloat(e.target.value) } : { radius: parseFloat(e.target.value) })} 
                />
              </div>
            )}
          </div>
        </>
      )}

      <div className="panel-header" style={{ marginTop: '1rem' }}>
        <Eye size={18} />
        Hiển Thị
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
        <div>
          <label>Độ trong suốt ({Math.round(opacity * 100)}%)</label>
          <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} />
        </div>
      </div>

      {showBuilder && <CustomShapeBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  );
};

export default ControlPanel;
