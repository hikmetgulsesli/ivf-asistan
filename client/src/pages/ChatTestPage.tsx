import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, RotateCcw, AlertTriangle, FileText, HelpCircle, Video as VideoIcon, ExternalLink } from 'lucide-react';
import { sendChatMessage, clearChatSession } from '../services/api';
import type { ChatSource } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  sentiment?: string;
  isEmergency?: boolean;
  emergencyMessage?: string;
}

const STAGES = [
  { value: '', label: 'Belirtilmemiş' },
  { value: 'initial_consultation', label: 'İlk Konsültasyon' },
  { value: 'testing', label: 'Test Aşaması' },
  { value: 'treatment_planning', label: 'Tedavi Planlama' },
  { value: 'stimulation', label: 'Stimülasyon' },
  { value: 'egg_retrieval', label: 'Yumurta Toplama' },
  { value: 'embryo_transfer', label: 'Embriyo Transferi' },
  { value: 'tww', label: 'İki Hafta Bekleme (TWW)' },
  { value: 'pregnancy', label: 'Gebelik' },
  { value: 'post_treatment', label: 'Tedavi Sonrası' },
];

function generateSessionId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const sourceIcon = (type: string) => {
  if (type === 'article') return <FileText className="w-3.5 h-3.5" />;
  if (type === 'faq') return <HelpCircle className="w-3.5 h-3.5" />;
  if (type === 'video') return <VideoIcon className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

export function ChatTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('');
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await sendChatMessage(trimmed, sessionId, stage || undefined);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        sentiment: res.sentiment,
        isEmergency: res.isEmergency,
        emergencyMessage: res.emergencyMessage,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mesaj gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = () => {
    setSessionId(generateSessionId());
    setMessages([]);
    setError('');
  };

  const handleClearSession = async () => {
    try {
      await clearChatSession(sessionId);
      setMessages([]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Session temizlenemedi');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sentimentColor = (s?: string) => {
    if (s === 'positive') return 'text-green-600 dark:text-green-400';
    if (s === 'negative') return 'text-red-500 dark:text-red-400';
    if (s === 'anxious') return 'text-amber-500 dark:text-amber-400';
    return 'text-[var(--text-muted)]';
  };

  return (
    <div className="p-8 h-[calc(100vh-0px)] flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Chat Test
          </h1>
          <p className="text-[var(--text-muted)] mt-1 text-sm">
            Session: <code className="text-xs bg-[var(--surface)] px-2 py-0.5 rounded">{sessionId}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stage}
            onChange={e => setStage(e.target.value)}
            className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {STAGES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            onClick={handleNewSession}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] transition-colors"
            title="Yeni session"
          >
            <RotateCcw className="w-4 h-4" />
            Yeni
          </button>
          <button
            onClick={handleClearSession}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Session'ı temizle"
          >
            <Trash2 className="w-4 h-4" />
            Temizle
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm mb-3">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-[var(--card)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            Bir mesaj göndererek chat'i test edin
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] space-y-2`}>
              {/* Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[var(--primary)] text-white rounded-br-md'
                    : 'bg-[var(--surface)] text-[var(--text)] rounded-bl-md border border-[var(--border)]'
                }`}
              >
                {msg.content}
              </div>

              {/* Emergency banner */}
              {msg.isEmergency && (
                <div className="flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{msg.emergencyMessage || 'Acil durum tespit edildi'}</span>
                </div>
              )}

              {/* Sentiment badge */}
              {msg.sentiment && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] ${sentimentColor(msg.sentiment)}`}>
                  {msg.sentiment}
                </span>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--text-muted)] font-medium">Kaynaklar:</p>
                  {msg.sources.map((src, j) => (
                    <div key={j} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      {sourceIcon(src.type)}
                      <span className="truncate">{src.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                        {src.type}
                      </span>
                      {src.url && (
                        <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--surface)] border border-[var(--border)]">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Mesajınızı yazın..."
          rows={1}
          className="flex-1 px-4 py-3 border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
