import React from 'react';
import { Plus, X, Eye, EyeOff, Calculator, Info } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';

const GraphingPanel: React.FC = () => {
  const { 
    expressions, 
    addExpression, 
    removeExpression, 
    updateExpression,
    x0,
    setX0
  } = useGeometryStore();

  return (
    <>
      <div className="sidebar sidebar-left glass" style={{ width: '360px', padding: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#58a6ff', marginBottom: '0.4rem' }}>
          <Calculator size={20} />
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Biểu thức</h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#8b949e' }}>Nhập các hàm số để vẽ đồ thị</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {expressions.map((exp, index) => (
            <div 
              key={exp.id} 
              className="glass" 
              style={{ 
                padding: '0.8rem', 
                borderRadius: '12px', 
                display: 'flex', 
                flexDirection: 'column',
                gap: '0.6rem',
                border: `1px solid ${exp.visible ? 'rgba(88,166,255,0.2)' : 'rgba(255,255,255,0.05)'}`,
                background: exp.visible ? 'rgba(88,166,255,0.03)' : 'rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div 
                  onClick={() => updateExpression(exp.id, { visible: !exp.visible })}
                  style={{ 
                    width: '24px', height: '24px', borderRadius: '50%', 
                    background: exp.visible ? exp.color : 'transparent',
                    border: `2px solid ${exp.color}`,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}
                >
                  {exp.visible ? <Eye size={12} color="black" /> : <EyeOff size={12} color={exp.color} />}
                </div>
                
                <div style={{ flex: 1, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '-1.5rem', top: '50%', transform: 'translateY(-50%)', color: '#484f58', fontSize: '0.8rem' }}>
                    {index + 1}
                  </span>
                  <input 
                    type="text" 
                    value={exp.formula} 
                    onChange={(e) => updateExpression(exp.id, { formula: e.target.value })}
                    placeholder="y = ..."
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      padding: '0.4rem 0', 
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      color: exp.visible ? '#f0f6fc' : '#484f58'
                    }}
                  />
                </div>

                <button 
                  onClick={() => removeExpression(exp.id)}
                  style={{ background: 'transparent', padding: '0.4rem', borderRadius: '4px', color: '#f85149' }}
                  className="btn-hover-red"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => addExpression()}
          style={{ 
            width: '100%', marginTop: '1rem', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px dashed rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            padding: '0.8rem', borderRadius: '12px', color: '#8b949e'
          }}
        >
          <Plus size={18} /> Thêm biểu thức mới
        </button>

      </div>

      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.8rem', fontWeight: 600 }}>✨ Khám phá ví dụ</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
          {[
            { 
              label: 'Trái tim', 
              formulas: ['(x^2 + y^2 - 1)^3 - x^2 * y^3 = 0'], 
              icon: '❤️' 
            },
            { 
              label: 'Mặt cười', 
              formulas: [
                'x^2 + y^2 - 25 = 0', 
                '(x+2.5)^2 + (y-2)^2 - 0.5 = 0', 
                '(x-2.5)^2 + (y-2)^2 - 0.5 = 0',
                'y + 0.1*x^2 + 2 = 0'
              ], 
              icon: '😊' 
            },
            { 
              label: 'Vô cực', 
              formulas: ['(x^2 + y^2)^2 - 16 * (x^2 - y^2) = 0'], 
              icon: '♾️' 
            },
            { 
              label: 'Hoa 4 cánh', 
              formulas: ['(x^2 + y^2)^3 - 16*x^2*y^2 = 0'], 
              icon: '🌸' 
            },
            { 
              label: 'Cánh bướm', 
              formulas: ['x^6 + y^6 - x^2 = 0'], 
              icon: '🦋' 
            },
            { 
              label: 'Sóng lượng tử', 
              formulas: [
                'sin(x) * exp(-0.1 * abs(x))',
                '-sin(x) * exp(-0.1 * abs(x))',
                'exp(-0.1 * abs(x))',
                '-exp(-0.1 * abs(x))'
              ], 
              icon: '🌊' 
            },
            {
              label: 'Quả cầu 3D',
              formulas: [
                'x^2 + y^2 - 25 = 0',
                'x^2 + y^2/0.1 - 25 = 0',
                'x^2 + y^2/0.3 - 25 = 0',
                'x^2 + y^2/0.6 - 25 = 0',
                'x^2/0.1 + y^2 - 25 = 0',
                'x^2/0.3 + y^2 - 25 = 0',
                'x^2/0.6 + y^2 - 25 = 0'
              ],
              icon: '🌐'
            },
            {
              label: 'Hoa Mandala',
              formulas: [
                'x^2 + y^2 - 16 = 0',
                '(x-4)^2 + y^2 - 16 = 0',
                '(x+4)^2 + y^2 - 16 = 0',
                'x^2 + (y-4)^2 - 16 = 0',
                'x^2 + (y+4)^2 - 16 = 0',
                '(x-2.83)^2 + (y-2.83)^2 - 16 = 0',
                '(x+2.83)^2 + (y-2.83)^2 - 16 = 0',
                '(x-2.83)^2 + (y+2.83)^2 - 16 = 0',
                '(x+2.83)^2 + (y+2.83)^2 - 16 = 0'
              ],
              icon: '🏵️'
            }
          ].map((ex) => (
            <button
              key={ex.label}
              onClick={() => {
                const colors = ['#58a6ff', '#ff7b72', '#7ee787', '#d2a8ff', '#ffa657'];
                const newExps = ex.formulas.map((f, i) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  formula: f,
                  color: colors[i % colors.length],
                  visible: true
                }));
                useGeometryStore.getState().setExpressions(newExps);
              }}
              style={{
                padding: '0.5rem', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#f0f6fc', fontSize: '0.75rem',
                cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(88,166,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <span>{ex.icon}</span> {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '0.8rem', color: '#8b949e', marginBottom: '0.5rem' }}>Khám phá tiếp tuyến x₀</div>
        <input 
          type="range" min="-10" max="10" step="0.1" 
          value={x0} 
          onChange={(e) => setX0(parseFloat(e.target.value))} 
          style={{ margin: 0 }}
        />
        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#58a6ff', marginTop: '0.2rem' }}>x₀ = {x0.toFixed(1)}</div>
      </div>
      </div>

      {/* Floating Instructions on the Canvas */}
      <div style={{
        position: 'absolute',
        top: '5.5rem',
        right: '1.5rem',
        background: 'rgba(13, 17, 23, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(88,166,255,0.2)',
        borderRadius: '12px',
        padding: '1.2rem',
        color: '#c9d1d9',
        fontSize: '0.8rem',
        width: '320px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        pointerEvents: 'none'
      }}>
        <div style={{ fontWeight: 600, color: '#58a6ff', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={16} /> Hướng dẫn cú pháp nhập liệu
        </div>
        <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li><b>Hàm tường minh:</b> <code>x^2</code>, <code>sin(x)</code>, <code>sqrt(x)</code>, <code>log(x)</code></li>
          <li><b>Hàm ẩn:</b> <code>x^2 + y^2 = 25</code></li>
          <li><b>Toán tử:</b> Nhân <code>*</code>, Chia <code>/</code>, Mũ <code>^</code></li>
          <li><i>(Đạo hàm và tiếp tuyến sẽ tự động xuất hiện với hàm tường minh khi di chuột)</i></li>
        </ul>
      </div>
    </>
  );
};

export default GraphingPanel;
