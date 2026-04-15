import React from 'react';
import { Info } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';

const PropertiesPanel: React.FC = () => {
  const { shapeData } = useGeometryStore();

  if (!shapeData) return null;

  // Map property keys to Vietnamese labels
  const labelMap: Record<string, string> = {
    volume: 'Thể tích (V)',
    surface_area: 'Diện tích toàn phần (Stp)',
    base_area: 'Diện tích đáy (Sd)',
    height: 'Chiều cao (h)',
    slant_height: 'Đường sinh (l)',
    radius: 'Bán kính (r)',
    base_size: 'Cạnh đáy (a)',
    side_length: 'Cạnh (a)',
    width: 'Chiều rộng (w)',
    depth: 'Chiều sâu (d)',
  };

  return (
    <div className="glass" style={{ padding: '1rem', borderRadius: '8px' }}>
      <div className="panel-header" style={{ fontSize: '0.75rem', marginBottom: '0.8rem' }}>
        <Info size={14} />
        Tính Chất Hình Học
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {Object.entries(shapeData.properties).map(([key, value]) => (
          <div key={key} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.65rem', color: '#8b949e' }}>{labelMap[key] || key}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#c9d1d9' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertiesPanel;
