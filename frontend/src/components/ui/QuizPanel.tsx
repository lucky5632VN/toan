import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, XCircle, Loader2, RefreshCw, Info, Trophy, Target, BookOpen } from 'lucide-react';
import api from '../../api/axios';

interface QuizData {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const TOPICS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Hình Chóp', value: 'pyramid' },
  { label: 'Hình Lăng Trụ', value: 'prism' },
  { label: 'Khối Cầu', value: 'sphere' },
  { label: 'Khối Nón', value: 'cone' },
  { label: 'Thiết Diện', value: 'cross_section' },
];

const QuizPanel: React.FC = () => {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getShapeForTopic = () => {
    if (selectedTopic === 'all') return { shape_type: 'all', params: {} };
    return { shape_type: selectedTopic, params: {} };
  };

  const fetchQuiz = async () => {
    setLoading(true);
    setQuiz(null);
    setSelectedOption(null);
    setShowResult(false);
    setErrorMsg(null);
    const { shape_type, params } = getShapeForTopic();
    try {
      const response = await api.post('/api/v1/quiz/generate', {
        shape_type: shape_type || 'pyramid',
        params: params
      });
      setQuiz(response.data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Không tải được bài tập';
      setErrorMsg(msg);
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
    if (!selectedOption || !quiz) return;
    setShowResult(true);
    setTotal(t => t + 1);
    if (selectedOption === quiz.correct_answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    fetchQuiz();
  };

  const resetScore = () => {
    setScore(0);
    setTotal(0);
    fetchQuiz();
  };

  const isCorrectAnswer = quiz && selectedOption === quiz.correct_answer;

  return (
    <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0d1117', overflowY: 'auto' }}>
      <div style={{ maxWidth: '720px', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ background: 'linear-gradient(135deg, #a371f7, #58a6ff)', padding: '0.6rem', borderRadius: '12px', boxShadow: '0 4px 16px rgba(163,113,247,0.3)' }}>
              <Sparkles color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f0f6fc', margin: 0 }}>Luyện Tập Cùng AI</h2>
              <div style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '0.2rem' }}>Câu hỏi được biên soạn theo hình khối đang học</div>
            </div>
          </div>

          {/* Score badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #30363d', padding: '0.5rem 1rem', borderRadius: '12px' }}>
            <Trophy size={16} color="#fbc02d" />
            <span style={{ fontWeight: 700, color: '#f0f6fc', fontSize: '0.9rem' }}>{score}</span>
            <span style={{ color: '#8b949e', fontSize: '0.85rem' }}>/ {total}</span>
            {total > 0 && (
              <button onClick={resetScore} title="Reset điểm" style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '0 0 0 0.3rem', fontSize: '0.7rem' }}>
                ↺
              </button>
            )}
          </div>
        </div>

        {/* Topic selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {TOPICS.map(t => (
            <button
              key={t.value}
              onClick={() => { setSelectedTopic(t.value); }}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: selectedTopic === t.value ? 'rgba(163,113,247,0.2)' : 'rgba(255,255,255,0.04)',
                border: selectedTopic === t.value ? '1px solid #a371f7' : '1px solid #30363d',
                color: selectedTopic === t.value ? '#a371f7' : '#8b949e',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={fetchQuiz}
          disabled={loading}
          style={{
            width: '100%', marginBottom: '1.5rem', padding: '0.75rem',
            background: loading ? '#21262d' : 'linear-gradient(135deg, #a371f7, #58a6ff)',
            color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700,
            fontSize: '0.9rem', cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(163,113,247,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {loading
            ? <><Loader2 size={18} style={{ animation: 'quiz-spin 1s linear infinite' }} /> Đang biên soạn câu hỏi...</>
            : <><BookOpen size={18} /> Tạo câu hỏi mới</>
          }
        </button>

        {/* Loading */}
        {loading && (
          <div style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Loader2 size={40} color="#a371f7" style={{ animation: 'quiz-spin 1s linear infinite' }} />
            <p style={{ color: '#8b949e' }}>AI đang biên soạn câu hỏi cho bạn...</p>
          </div>
        )}

        {/* Error */}
        {!loading && errorMsg && (
          <div style={{ padding: '1.5rem', borderRadius: '12px', background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)', color: '#f85149', textAlign: 'center' }}>
            <XCircle size={32} style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: 600 }}>Không tải được bài tập</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: '#8b949e' }}>{errorMsg}</div>
          </div>
        )}

        {/* Quiz card */}
        {!loading && quiz && (
          <div style={{ animation: 'quiz-fadein 0.3s ease' }}>
            <div className="glass" style={{ padding: '2rem', borderRadius: '16px', border: '1px solid rgba(163,113,247,0.2)' }}>
              {/* Question */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(163,113,247,0.15)', border: '1px solid rgba(163,113,247,0.3)', borderRadius: '8px', padding: '0.3rem 0.7rem', flexShrink: 0, height: 'fit-content', marginTop: '0.2rem' }}>
                  <Target size={14} color="#a371f7" />
                </div>
                <div style={{ fontSize: '1.05rem', color: '#f0f6fc', lineHeight: 1.7, fontWeight: 500 }}>
                  {quiz.question}
                </div>
              </div>

              {/* Options */}
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {quiz.options.map((opt, i) => {
                  const isSelected = selectedOption === opt;
                  const isCorrect = opt === quiz.correct_answer;
                  let bg = 'rgba(255,255,255,0.03)';
                  let border = '1px solid #30363d';
                  let textColor = '#c9d1d9';

                  if (showResult) {
                    if (isCorrect) { bg = 'rgba(35,134,54,0.15)'; border = '1px solid #238636'; textColor = '#7ee787'; }
                    else if (isSelected) { bg = 'rgba(248,81,73,0.15)'; border = '1px solid #f85149'; textColor = '#f85149'; }
                  } else if (isSelected) {
                    border = '1px solid #a371f7'; bg = 'rgba(163,113,247,0.08)'; textColor = '#f0f6fc';
                  }

                  return (
                    <div
                      key={i}
                      onClick={() => handleSelect(opt)}
                      style={{
                        padding: '1rem 1.2rem', borderRadius: '12px', background: bg, border,
                        cursor: showResult ? 'default' : 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', border: '2px solid',
                        borderColor: showResult && isCorrect ? '#238636' : showResult && isSelected ? '#f85149' : isSelected ? '#a371f7' : '#30363d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        color: isSelected ? '#a371f7' : '#8b949e', background: isSelected ? 'rgba(163,113,247,0.1)' : 'transparent',
                      }}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <div style={{ color: textColor, flex: 1, fontSize: '0.95rem' }}>{opt}</div>
                      {showResult && isCorrect && <CheckCircle2 size={20} color="#238636" style={{ flexShrink: 0 }} />}
                      {showResult && isSelected && !isCorrect && <XCircle size={20} color="#f85149" style={{ flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              {!showResult ? (
                <button
                  onClick={checkAnswer}
                  disabled={!selectedOption}
                  style={{
                    width: '100%', marginTop: '1.5rem', padding: '1rem', borderRadius: '12px',
                    background: selectedOption ? '#1f6feb' : '#21262d',
                    color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem',
                    cursor: selectedOption ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                  }}
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <>
                  {/* Result banner */}
                  <div style={{
                    marginTop: '1.5rem', padding: '1rem 1.5rem', borderRadius: '12px',
                    background: isCorrectAnswer ? 'rgba(35,134,54,0.1)' : 'rgba(248,81,73,0.1)',
                    border: `1px solid ${isCorrectAnswer ? 'rgba(35,134,54,0.3)' : 'rgba(248,81,73,0.3)'}`,
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                  }}>
                    {isCorrectAnswer
                      ? <CheckCircle2 size={22} color="#238636" />
                      : <XCircle size={22} color="#f85149" />
                    }
                    <div style={{ fontWeight: 700, color: isCorrectAnswer ? '#7ee787' : '#f85149' }}>
                      {isCorrectAnswer ? '🎉 Chính xác! Bạn đã trả lời đúng.' : '❌ Chưa đúng rồi. Cùng xem lại nhé!'}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div style={{ marginTop: '1rem', padding: '1.2rem', borderRadius: '12px', background: 'rgba(88,166,255,0.05)', border: '1px solid rgba(88,166,255,0.1)' }}>
                    <div style={{ fontWeight: 700, color: '#58a6ff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Info size={16} /> Giải thích:
                    </div>
                    <div style={{ color: '#c9d1d9', fontSize: '0.9rem', lineHeight: 1.7 }}>{quiz.explanation}</div>
                  </div>

                  {/* Next button */}
                  <button
                    onClick={handleNext}
                    style={{
                      width: '100%', marginTop: '1rem', padding: '1rem', borderRadius: '12px',
                      background: 'linear-gradient(135deg, #a371f7, #58a6ff)',
                      color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.95rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      boxShadow: '0 4px 16px rgba(163,113,247,0.3)',
                    }}
                  >
                    <RefreshCw size={17} /> Câu tiếp theo
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes quiz-spin { to { transform: rotate(360deg); } }
        @keyframes quiz-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default QuizPanel;
