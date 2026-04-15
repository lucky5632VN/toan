import React from 'react';
import { BookOpen, Cpu, Hand } from 'lucide-react';
import { useGestureStore } from '../../store/useGestureStore';

const Header: React.FC = () => {
  const { isEnabled, setEnabled } = useGestureStore();

  return (
    <header className="glass" style={{ padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{ background: '#58a6ff', color: 'black', padding: '0.4rem', borderRadius: '8px' }}>
          <BookOpen size={20} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f6fc' }}>
            STEM Toán Học 3D
          </h1>
          <p style={{ margin: 0, fontSize: '0.7rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hệ sinh thái hình học tương tác tích hợp AI
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={() => setEnabled(!isEnabled)}
          style={{ 
            background: isEnabled ? '#238636' : '#21262d',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem'
          }}
        >
          <Hand size={14} />
          {isEnabled ? 'Tắt Điều Khiển Tay' : 'Bật Điều Khiển Tay'}
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#58a6ff', background: 'rgba(88, 166, 255, 0.1)', padding: '0.3rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(88, 166, 255, 0.2)' }}>
          <Cpu size={14} />
          <span>Giai đoạn 2: Hand Control</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
