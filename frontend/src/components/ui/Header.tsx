import React, { useState } from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import QuizModal from './QuizModal';

const Header: React.FC = () => {
  const [showQuiz, setShowQuiz] = useState(false);

  return (
    <>
      <header className="glass" style={{ padding: '0.8rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ background: '#58a6ff', color: 'black', padding: '0.4rem', borderRadius: '8px' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#f0f6fc' }}>
              SPATIAL MIND 3D
            </h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hệ sinh thái hình học tương tác tích hợp AI
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setShowQuiz(true)}
            style={{ 
              background: 'linear-gradient(135deg, #1f6feb, #a371f7)',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.1rem',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(31,111,235,0.4)',
            }}
          >
            <Sparkles size={16} />
            Tạo Bài Tập AI
          </button>
        </div>
      </header>
      
      {showQuiz && <QuizModal onClose={() => setShowQuiz(false)} />}
    </>
  );
};

export default Header;
