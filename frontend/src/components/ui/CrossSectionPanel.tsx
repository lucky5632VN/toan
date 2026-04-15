import React from 'react';
import { Scissors, MousePointer2, Info } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import { useGeometryAPI } from '../../hooks/useGeometryAPI';

const CrossSectionPanel: React.FC = () => {
  const { plane, setPlane, crossSection, isComputingSection } = useGeometryStore();
  const { computeSection } = useGeometryAPI();

  const handleNormalChange = (idx: number, val: string) => {
    const fVal = parseFloat(val) || 0;
    const nextNormal = [...plane.normal] as [number, number, number];
    nextNormal[idx] = fVal;
    setPlane({ normal: nextNormal });
  };

  const handlePointChange = (idx: number, val: string) => {
    const fVal = parseFloat(val) || 0;
    const nextPoint = [...plane.point] as [number, number, number];
    nextPoint[idx] = fVal;
    setPlane({ point: nextPoint });
  };

  return (
    <div className="sidebar sidebar-right glass">
      <div className="panel-header">
        <Scissors size={18} />
        Bài Toán Thiết Diện
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label>Mặt phẳng (P): Ax + By + Cz + D = 0</label>
        <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.5rem' }}>
          Nhập Vector pháp tuyến <span style={{ color: '#58a6ff' }}>n⃗(a, b, c)</span>:
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <label>a</label>
            <input type="number" value={plane.normal[0]} onChange={(e) => handleNormalChange(0, e.target.value)} />
          </div>
          <div>
            <label>b</label>
            <input type="number" value={plane.normal[1]} onChange={(e) => handleNormalChange(1, e.target.value)} />
          </div>
          <div>
            <label>c</label>
            <input type="number" value={plane.normal[2]} onChange={(e) => handleNormalChange(2, e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#8b949e' }}>
          Điểm <span style={{ color: '#58a6ff' }}>M(x₀, y₀, z₀)</span> thuộc (P):
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div>
            <label>x₀</label>
            <input type="number" value={plane.point[0]} onChange={(e) => handlePointChange(0, e.target.value)} />
          </div>
          <div>
            <label>y₀</label>
            <input type="number" value={plane.point[1]} onChange={(e) => handlePointChange(1, e.target.value)} />
          </div>
          <div>
            <label>z₀</label>
            <input type="number" value={plane.point[2]} onChange={(e) => handlePointChange(2, e.target.value)} />
          </div>
        </div>

        <button 
          onClick={computeSection} 
          disabled={isComputingSection}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          {isComputingSection ? 'Đang tính...' : 'Tính Thiết Diện'}
          <MousePointer2 size={16} />
        </button>
      </div>

      {crossSection && !crossSection.error && (
        <div className="animate-fade-in" style={{ padding: '1rem', background: 'rgba(88, 166, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
          <div className="panel-header" style={{ color: '#ffeb3b', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
            <Info size={16} />
            Kết Quả
          </div>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>Dạng: <b>{crossSection.shape_name}</b></p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.2rem' }}>Diện tích: <b>{crossSection.area.toFixed(2)}</b> đơn vị²</p>
          <p style={{ fontSize: '0.9rem' }}>Chu vi: <b>{crossSection.perimeter.toFixed(2)}</b> đơn vị</p>
        </div>
      )}

      {crossSection?.error && (
        <div style={{ padding: '1rem', background: 'rgba(248, 81, 73, 0.1)', borderRadius: '8px', border: '1px solid rgba(248, 81, 73, 0.2)', color: '#f85149', fontSize: '0.8rem' }}>
          {crossSection.error}
        </div>
      )}
    </div>
  );
};

export default CrossSectionPanel;
