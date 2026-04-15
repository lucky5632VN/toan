import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';
import { MessageSquare, Send, User, Bot, Loader2, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGeometryStore } from '../../store/useGeometryStore';
import { parseMarkdown } from '../../utils/markdown';
import type { ShapeType } from '../../types/geometry';
import api from '../../api/axios';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

// ─── Constants ──────────────────────────────────────────────────────────────

// ─── Constants ──────────────────────────────────────────────────────────────
// API URL is now handled by centralized axios config

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '0.6rem 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#58a6ff',
            animation: 'tutorPulse 1.4s infinite ease-in-out',
            animationDelay: `${i * 0.2}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

const AITutorPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: crypto.randomUUID(),
    role: 'ai',
    content: 'Chào em! 👋 Thầy là **Gia sư STEM AI**. Em đang nhìn thấy hình khối 3D phía sau. Thầy có thể giúp em đổi hình khối, cắt lớp, hay tô màu mặt cắt. Hãy nói thử xem!',
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { 
    selectedShape, shapeParams,
    setSelectedShape, updateParams, setPlane, setCrossSectionColor, setShapeData
  } = useGeometryStore();

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const shapeContext = selectedShape
      ? `\n\n[Dữ liệu hình ảnh nền: Học sinh đang tương tác với (${selectedShape}). Parameter: ${JSON.stringify(shapeParams)}. Bỏ qua thông tin này nếu học sinh không trực tiếp hỏi về nó]`
      : '';

    const chatHistory = messages
      .map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        content: msg.content
      }));

    try {
      const payload = {
        user_message: text.trim() + shapeContext,
        chat_history: chatHistory
      };

      const response = await api.post('/api/v1/chat/math-tutor', payload);
      const result = response.data;
      let aiResponseText = result.response;

      // Extract Control Command
      const actionRegex = /```json:Action\s*([\s\S]*?)\s*```/i;
      const match = actionRegex.exec(aiResponseText);
      
      if (match && match[1]) {
        try {
          const actionData = JSON.parse(match[1]);
          if (actionData.action === 'update_scene') {
            if (actionData.shape_type) setSelectedShape(actionData.shape_type as ShapeType);
            if (actionData.params) updateParams(actionData.params);
            if (actionData.plane) setPlane(actionData.plane);
            if (actionData.color) setCrossSectionColor(actionData.color);
          } else if (actionData.action === 'create_custom' && actionData.data) {
            const cd = actionData.data;
            if (!cd.edges) cd.edges = [];
            if (!cd.properties) cd.properties = {};
            cd.shape_type = 'custom';
            setSelectedShape('custom');
            setShapeData(cd);
          }
        } catch (e) {
          console.error("Failed to parse Action JSON from AI", e);
        }
        // Hide the command block from UI
        aiResponseText = aiResponseText.replace(match[0], '').trim();
      }
      
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'ai',
        content: aiResponseText,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      const msg = err instanceof TypeError && err.message === 'Failed to fetch' 
        ? '⚠️ Không thể kết nối tới Backend (Cổng 8000). Vui lòng kiểm tra server.'
        : `Lỗi: ${err.message}`;
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, selectedShape, shapeParams, setSelectedShape, updateParams, setPlane, setCrossSectionColor]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: crypto.randomUUID(),
      role: 'ai',
      content: 'Chào em! 👋 Thầy là **Gia sư STEM AI**. Em đang nhìn thấy hình khối 3D phía sau. Hãy đặt câu hỏi bất kỳ về hình học nhé!',
      timestamp: new Date(),
    }]);
    setError(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes tutorPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%           { transform: scale(1);   opacity: 1;   }
        }
      `}</style>

      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000 }}>
        {/* ── Toggle Button ── */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 58, height: 58, borderRadius: '50%',
            background: 'linear-gradient(135deg, #58a6ff, #a371f7)',
            border: 'none', color: '#fff',
            boxShadow: '0 8px 28px rgba(88,166,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', position: 'relative',
          }}
        >
          <MessageSquare size={26} />
          {/* Unread dot */}
          {!isOpen && messages.length > 1 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: '#f85149', border: '2px solid #0d1117',
            }} />
          )}
        </motion.button>

        {/* ── Chat Window ── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 16 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              style={{
                position: 'absolute', bottom: 72, right: 0,
                width: 400, height: 540,
                borderRadius: 18,
                display: 'flex', flexDirection: 'column',
                background: 'rgba(13,17,23,0.96)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(88,166,255,0.2)',
                boxShadow: '0 16px 56px rgba(0,0,0,0.6)',
                overflow: 'hidden',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                padding: '0.85rem 1rem',
                background: 'linear-gradient(90deg, rgba(88,166,255,0.12), rgba(163,113,247,0.12))',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg,#58a6ff,#a371f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, boxShadow: '0 4px 12px rgba(88,166,255,0.3)',
                }}>
                  <Bot size={18} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f0f6fc' }}>Gia sư STEM AI</div>
                  <div style={{ fontSize: '0.65rem', color: '#58a6ff' }}>
                    ✦ Đang hoạt động
                  </div>
                </div>
                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {messages.length > 1 && (
                    <button onClick={clearChat} title="Xoá hội thoại"
                      style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#f85149')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#8b949e')}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} title="Đóng"
                    style={{ background: 'transparent', border: 'none', color: '#8b949e', cursor: 'pointer', padding: 4, borderRadius: 6 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f0f6fc')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8b949e')}
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* ── Body: Chat ── */}
              <div
                ref={scrollRef}
                style={{
                  flex: 1, overflowY: 'auto', padding: '1rem',
                  display: 'flex', flexDirection: 'column', gap: '1rem',
                }}
              >
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                      gap: '0.65rem', alignItems: 'flex-start',
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg,#1f6feb,#388bfd)'
                        : 'linear-gradient(135deg,#58a6ff,#a371f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 2,
                    }}>
                      {msg.role === 'user'
                        ? <User size={13} color="#fff" />
                        : <Bot size={13} color="#fff" />
                      }
                    </div>

                    {/* Bubble */}
                    <div style={{
                      maxWidth: '82%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg,#1f6feb,#388bfd)'
                        : 'rgba(30,36,46,0.9)',
                      border: msg.role === 'ai' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      fontSize: '0.84rem',
                      lineHeight: 1.6,
                      color: '#f0f6fc',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    }}>
                      {msg.role === 'user' ? (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg,#58a6ff,#a371f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Bot size={13} color="#fff" />
                    </div>
                    <div style={{
                      padding: '0.7rem 0.9rem',
                      borderRadius: '14px 14px 14px 4px',
                      background: 'rgba(30,36,46,0.9)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div style={{
                    padding: '0.6rem 0.9rem',
                    borderRadius: 10,
                    background: 'rgba(248,81,73,0.1)',
                    border: '1px solid rgba(248,81,73,0.3)',
                    color: '#f85149', fontSize: '0.8rem',
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                  }}>
                    <span style={{ flexShrink: 0 }}>⚠️</span><span style={{ wordBreak: 'break-word' }}>{error}</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{
                padding: '0.75rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
                flexShrink: 0,
              }}>
                <textarea
                  ref={inputRef}
                  placeholder="Hỏi gia sư... (Enter gửi, Shift+Enter xuống dòng)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', overflow: 'hidden',
                    padding: '0.55rem 0.85rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid #30363d',
                    borderRadius: 12, color: '#f0f6fc',
                    fontSize: '0.85rem', fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.5,
                    transition: 'border-color 0.2s',
                    minHeight: 38, maxHeight: 112,
                  }}
                  onFocus={e => (e.target.style.borderColor = '#58a6ff')}
                  onBlur={e => (e.target.style.borderColor = '#30363d')}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: (input.trim() && !isLoading)
                      ? 'linear-gradient(135deg,#58a6ff,#a371f7)'
                      : '#30363d',
                    color: '#fff', cursor: (input.trim() && !isLoading) ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
                    boxShadow: (input.trim() && !isLoading) ? '0 4px 12px rgba(88,166,255,0.25)' : 'none',
                  }}
                >
                  {isLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AITutorPanel;
