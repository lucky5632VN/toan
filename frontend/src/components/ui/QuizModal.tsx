import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, BrainCircuit, RefreshCw, Loader2 } from 'lucide-react';
import { useGeometryStore } from '../../store/useGeometryStore';
import api from '../../api/axios';

interface QuizData {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

interface QuizModalProps {
  onClose: () => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ onClose }) => {
  const { selectedShape, shapeParams } = useGeometryStore();
  
  const [loading, setLoading] = useState(true);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    setSelectedOption(null);
    setIsCorrect(null);
    
    try {
      const payload = {
        shape_type: selectedShape,
        params: shapeParams
      };
      
      const res = await api.post('/api/v1/quiz/generate', payload);
      setQuizData(res.data);
    } catch (err: any) {
      console.error(err);
      setError('Không thể tạo bài tập lúc này. Hãy thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const hasFetched = React.useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      fetchQuiz();
      hasFetched.current = true;
    }
  }, []);

  const handleOptionClick = (option: string) => {
    if (selectedOption !== null || !quizData) return; // Prevent multiple clicks
    
    setSelectedOption(option);
    // Determine correctness by checking if the option string matches the correct_answer string.
    // Sometimes LLMs structure exact matches or prefix with A/B/C/D.
    const correct = option.trim() === quizData.correct_answer.trim() || 
                    option.includes(quizData.correct_answer.trim()) ||
                    quizData.correct_answer.includes(option.trim());
    setIsCorrect(correct);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        width: '500px', maxWidth: '90vw',
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(90deg, rgba(31,111,235,0.1), rgba(163,113,247,0.05))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BrainCircuit size={20} color="#a371f7" />
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#f0f6fc', fontWeight: 600 }}>Tạo Bài Tập AI</h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', flex: 1, minHeight: '300px' }}>
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: '#8b949e' }}>
              <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} color="#58a6ff" />
              <span>Gemini đang phân tích hình khối và tạo câu hỏi...</span>
            </div>
          )}

          {error && (
            <div style={{ color: '#f85149', textAlign: 'center', padding: '2rem 0' }}>
              {error}
            </div>
          )}

          {!loading && !error && quizData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Question */}
              <div style={{ fontSize: '1.05rem', color: '#e6edf3', lineHeight: 1.6, fontWeight: 500 }}>
                {quizData.question}
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {quizData.options.map((option, idx) => {
                  
                  const isThisSelected = option === selectedOption;
                  const isThisCorrect = option === quizData.correct_answer || option.includes(quizData.correct_answer) || quizData.correct_answer.includes(option);
                  
                  let bgColors = 'rgba(255,255,255,0.04)';
                  let borderColor = 'rgba(255,255,255,0.1)';
                  
                  if (selectedOption !== null) {
                    if (isThisCorrect) {
                      bgColors = 'rgba(35,134,54,0.15)';
                      borderColor = '#238636';
                    } else if (isThisSelected && !isThisCorrect) {
                      bgColors = 'rgba(248,81,73,0.1)';
                      borderColor = '#f85149';
                    }
                  }

                  return (
                    <button 
                      key={idx}
                      onClick={() => handleOptionClick(option)}
                      style={{
                        padding: '1rem', borderRadius: '10px',
                        background: bgColors, border: `1px solid ${borderColor}`,
                        color: '#c9d1d9', textAlign: 'left', fontSize: '0.95rem',
                        cursor: selectedOption !== null ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onMouseEnter={e => { if (selectedOption === null) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                      onMouseLeave={e => { if (selectedOption === null) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                    >
                      <span style={{ lineHeight: 1.4 }}>{option}</span>
                      
                      {selectedOption !== null && isThisCorrect && <CheckCircle2 size={18} color="#2ea043" />}
                      {selectedOption !== null && isThisSelected && !isThisCorrect && <XCircle size={18} color="#f85149" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {selectedOption !== null && (
                <div style={{ 
                  marginTop: '1rem', padding: '1.2rem',
                  background: isCorrect ? 'rgba(35,134,54,0.08)' : 'rgba(248,81,73,0.05)',
                  border: `1px solid ${isCorrect ? 'rgba(35,134,54,0.2)' : 'rgba(248,81,73,0.2)'}`,
                  borderRadius: '10px'
                }}>
                  <div style={{ fontWeight: 600, color: isCorrect ? '#2ea043' : '#f85149', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isCorrect ? <><CheckCircle2 size={16}/> Chính xác!</> : <><XCircle size={16}/> Rất tiếc, câu trả lời chưa đúng!</>}
                  </div>
                  <div style={{ color: '#8b949e', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {quizData.explanation}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end'
        }}>
          <button 
            onClick={fetchQuiz}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'transparent', border: '1px solid rgba(88,166,255,0.4)',
              color: '#58a6ff', padding: '0.5rem 1rem', borderRadius: '6px',
              fontSize: '0.85rem', cursor: loading ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Đang tạo...' : 'Tạo câu hỏi khác'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
