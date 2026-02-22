import { useState, useRef, KeyboardEvent, MouseEvent } from 'react';
import { MessageCircle, X, Send, FileText, Video, HelpCircle } from 'lucide-react';
import { Message, Source } from './types';
import './widget.css';

export interface ChatWidgetProps {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  suggestedQuestions: string[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (message: string) => void;
  onToggleOpen: () => void;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
}

function SourceIcon({ type }: { type: Source['type'] }) {
  switch (type) {
    case 'video':
      return <Video className="ivf-source-icon" />;
    case 'faq':
      return <HelpCircle className="ivf-source-icon" />;
    default:
      return <FileText className="ivf-source-icon" />;
  }
}

function SourceCard({ source }: { source: Source }) {
  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Allow default navigation if URL exists, otherwise prevent
    if (!source.url) {
      e.preventDefault();
    }
  };

  const typeLabels = {
    article: 'Makale',
    video: 'Video',
    faq: 'SSS'
  };

  return (
    <a
      href={source.url || '#'}
      className="ivf-source-card"
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <SourceIcon type={source.type} />
      <div className="ivf-source-info">
        <div className="ivf-source-title">{source.title}</div>
        <div className="ivf-source-meta">
          {typeLabels[source.type]}
          {source.timestamp && ` • ${source.timestamp}`}
        </div>
      </div>
    </a>
  );
}

function TypingIndicator() {
  return (
    <div className="ivf-typing-indicator">
      <span className="ivf-typing-dot" />
      <span className="ivf-typing-dot" />
      <span className="ivf-typing-dot" />
    </div>
  );
}

export function ChatWidget({
  isOpen,
  messages,
  isLoading,
  suggestedQuestions,
  messagesEndRef,
  onSendMessage,
  onToggleOpen,
  theme = 'light',
  position = 'bottom-right'
}: ChatWidgetProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (question: string) => {
    if (!isLoading) {
      onSendMessage(question);
    }
  };

  const widgetClass = [
    'ivf-chat-widget',
    theme === 'dark' ? 'ivf-dark' : '',
    position === 'bottom-left' ? 'ivf-position-left' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={widgetClass}>
      {/* Chat Window */}
      <div className={`ivf-chat-window ${isOpen ? 'ivf-chat-open' : ''}`}>
        {/* Header */}
        <div className="ivf-chat-header">
          <div>
            <div className="ivf-chat-header-title">IVF Asistan</div>
            <div className="ivf-chat-header-subtitle">Size yardımcı olmak için buradayım</div>
          </div>
          <button
            className="ivf-chat-close-btn"
            onClick={onToggleOpen}
            aria-label="Sohbeti kapat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="ivf-chat-messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`ivf-message ${message.role === 'user' ? 'ivf-message-user' : 'ivf-message-assistant'}`}
            >
              <div>{message.content}</div>
              
              {/* Source Cards */}
              {message.sources && message.sources.length > 0 && (
                <div className="ivf-source-cards">
                  {message.sources.map((source, idx) => (
                    <SourceCard key={`${source.type}-${source.id}-${idx}`} source={source} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && <TypingIndicator />}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {suggestedQuestions.length > 0 && messages.length <= 1 && (
          <div className="ivf-suggestions">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                className="ivf-suggestion-btn"
                onClick={() => handleSuggestionClick(question)}
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="ivf-chat-input-area">
          <textarea
            ref={inputRef}
            className="ivf-chat-input"
            placeholder="Sorunuzu yazın..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
            aria-label="Mesajınız"
          />
          <button
            className="ivf-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="Gönder"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <button
        className="ivf-chat-button"
        onClick={onToggleOpen}
        aria-label={isOpen ? 'Sohbeti kapat' : 'Sohbeti aç'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
