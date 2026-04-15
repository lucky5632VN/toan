import React from 'react';
import { List } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';

const CoordDisplay: React.FC = () => {
  const { shapeData } = useGeometryStore();

  if (!shapeData) return null;

  return (
    <div className="glass" style={{ padding: '1rem', borderRadius: '8px', marginTop: 'auto' }}>
      <div className="panel-header" style={{ fontSize: '0.75rem', marginBottom: '0.8rem' }}>
        <List size={14} />
        Bảng Tọa Độ Đỉnh
      </div>
      
      <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #30363d', color: '#8b949e' }}>
              <th style={{ textAlign: 'left', padding: '0.3rem' }}>Đỉnh</th>
              <th style={{ textAlign: 'left', padding: '0.3rem' }}>X</th>
              <th style={{ textAlign: 'left', padding: '0.3rem' }}>Y</th>
              <th style={{ textAlign: 'left', padding: '0.3rem' }}>Z</th>
            </tr>
          </thead>
          <tbody>
            {shapeData.vertices.map((v, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #21262d' }}>
                <td style={{ padding: '0.3rem', color: '#58a6ff', fontWeight: 600 }}>
                  {shapeData.vertex_labels[idx] || `V${idx}`}
                </td>
                <td style={{ padding: '0.3rem' }}>{v[0].toFixed(1)}</td>
                <td style={{ padding: '0.3rem' }}>{v[1].toFixed(1)}</td>
                <td style={{ padding: '0.3rem' }}>{v[2].toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CoordDisplay;
