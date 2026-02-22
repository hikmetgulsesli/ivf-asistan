import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, ChatState } from './types';

const STORAGE_KEY = 'ivf-chat-session';

const DEFAULT_WELCOME = 'Merhaba! IVF süreciyle ilgili sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?';

export interface UseChatOptions {
  apiUrl?: string;
  welcomeMessage?: string;
  clinic?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const { 
    apiUrl = '/api', 
    welcomeMessage = DEFAULT_WELCOME,
    clinic = 'default'
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${clinic}`);
    if (stored) {
      try {
        const data = JSON.parse(stored) as ChatState;
        if (data.sessionId && data.messages.length > 0) {
          setSessionId(data.sessionId);
          setMessages(data.messages);
          return;
        }
      } catch {
        // Invalid stored data
      }
    }
    
    // Create new session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: Date.now()
    }]);
  }, [clinic, welcomeMessage]);

  // Persist to localStorage
  useEffect(() => {
    if (sessionId && messages.length > 0) {
      const state: ChatState = { sessionId, messages };
      localStorage.setItem(`${STORAGE_KEY}-${clinic}`, JSON.stringify(state));
    }
  }, [sessionId, messages, clinic]);

  // Load suggested questions
  useEffect(() => {
    fetch(`${apiUrl}/suggestions`)
      .then(res => res.json())
      .then(data => {
        if (data.data?.questions) {
          setSuggestedQuestions(data.data.questions.slice(0, 4));
        }
      })
      .catch(() => {
        // Fallback suggestions
        setSuggestedQuestions([
          'IVF tedavisine nasıl hazırlanmalıyım?',
          'Embriyo transferi sonrası nelere dikkat etmeliyim?',
          'Tüp bebek tedavisinde beslenme önerileri nelerdir?',
          'Tedavi sürecinde stresi nasıl yönetebilirim?'
        ]);
      });
  }, [apiUrl]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          session_id: sessionId
        })
      });

      if (!response.ok) throw new Error('API error');

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data.data?.answer || data.answer || 'Bir hata oluştu, lütfen tekrar deneyin.',
        sources: data.data?.sources || data.sources || [],
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Üzgünüm, şu anda bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, sessionId, isLoading]);

  const clearSession = useCallback(() => {
    localStorage.removeItem(`${STORAGE_KEY}-${clinic}`);
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setSessionId(newSessionId);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: Date.now()
    }]);
  }, [clinic, welcomeMessage]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    messages,
    isLoading,
    suggestedQuestions,
    sessionId,
    messagesEndRef,
    sendMessage,
    clearSession,
    toggleOpen,
    setIsOpen
  };
}
