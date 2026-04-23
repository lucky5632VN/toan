import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import api from '../../api/axios';

interface QuizData {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const QuizPanel: React.FC = () => {
  const { selectedShape, shapeParams } = useGeometryStore();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    setQuiz(null);
    setSelectedOption(null);
    setShowResult(false);
    try {
      const response = await api.post('/api/v1/quiz/generate', {
        shape_type: selectedShape,
        params: shapeParams
      });
      setQuiz(response.data);
    } catch (err) {
      console.error('Lỗi khi tạo bài tập:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuiz();
  }, []);

  const handleSelect = (opt: string) => {
    if (showResult) return;
    setSelectedOption(opt);
  };

  const checkAnswer = () => {
    if (!selectedOption) return;
    setShowResult(true);
  };

  return (
    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0d1117' }}>
      <div style={{ maxWidth: '700px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <Sparkles color="#a371f7" size={28} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f0f6fc', margin: 0 }}>Luyện tập với AI</h2>
          </div>
          <button 
            onClick={fetchQuiz} 
            disabled={loading}
            style={{ 
              background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', 
              padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' 
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm câu khác
          </button>
        </div>

        {loading ? (
          <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Loader2 size={40} color="#58a6ff" className="animate-spin" />
            <p style={{ color: '#8b949e' }}>AI đang biên soạn câu hỏi cho bạn...</p>
          </div>
        ) : quiz ? (
          <div className="animate-fade-in">
            <div className="glass" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(163, 113, 247, 0.2)' }}>
              <div style={{ fontSize: '1.1rem', color: '#f0f6fc', lineHeight: 1.6, marginBottom: '2rem', fontWeight: 500 }}>
                {quiz.question}
              </div>

              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {quiz.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrect = opt === quiz.correct_answer;
                  let bg = 'rgba(255,255,255,0.03)';
                  let border = '1px solid #30363d';

                  if (showResult) {
                    if (isCorrect) {
                      bg = 'rgba(35, 134, 54, 0.15)';
                      border = '1px solid #238636';
                    } else if (isSelected) {
                      bg = 'rgba(248, 81, 73, 0.15)';
                      border = '1px solid #f85149';
                    }
                  } else if (isSelected) {
                    border = '1px solid #58a6ff';
                    bg = 'rgba(88,166,255,0.05)';
                  }

                  return (
                    <div 
                      key={i} 
                      onClick={() => handleSelect(opt)}
                      style={{ 
                        padding: '1rem 1.2rem', borderRadius: '12px', background: bg, border,
                        cursor: showResult ? 'default' : 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '1rem'
                      }}
                    >
                      <div style={{ 
                        width: 24, height: 24, borderRadius: '50%', border: '2px solid',
                        borderColor: isSelected ? '#58a6ff' : '#30363d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                        color: isSelected ? '#58a6ff' : '#8b949e'
                      }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div style={{ color: '#c9d1d9' }}>{opt}</div>
                      {showResult && isCorrect && <CheckCircle2 size={18} color="#238636" style={{ marginLeft: 'auto' }} />}
                      {showResult && isSelected && !isCorrect && <XCircle size={18} color="#f85149" style={{ marginLeft: 'auto' }} />}
                    </div>
                  );
                })}
              </div>

              {!showResult ? (
                <button 
                  onClick={checkAnswer} 
                  disabled={!selectedOption}
                  style={{ width: '100%', marginTop: '2rem', padding: '1rem', borderRadius: '12px', background: '#1f6feb' }}
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '12px', background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.1)' }}>
                  <div style={{ fontWeight: 700, color: '#58a6ff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Info size={16} /> Giải thích:
                  </div>
                  <div style={{ color: '#8b949e', fontSize: '0.9rem', lineHeight: 1.6 }}>{quiz.explanation}</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '4rem' }}>
            Không tải được bài tập. Hãy thử lại.
          </div>
        )}
      </div>
    </div>
  );
};

import { Info } from 'lucide-react';

export default QuizPanel;
