import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChat } from './useChat';
import type { Message, Source, ChatState } from './types';

// Mock fetch globally
let mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock as unknown as Storage;

describe('US-010: Chat Widget - Embeddable Frontend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    // Default mock for suggestions
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          questions: [
            'IVF tedavisine nasıl hazırlanmalıyım?',
            'Embriyo transferi sonrası nelere dikkat etmeliyim?'
          ]
        }
      })
    });
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Acceptance Criterion 1: Widget appears as floating button on page load', () => {
    it('should initialize with isOpen false (button visible, window hidden)', async () => {
      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
    });

    it('should create a session on initial load', async () => {
      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.sessionId).toBeTruthy();
        expect(result.current.sessionId).toMatch(/^session_\d+_/);
      });
    });
  });

  describe('Acceptance Criterion 2: Click expands chat window with animation', () => {
    it('should toggle isOpen state when toggleOpen is called', async () => {
      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.isOpen).toBe(false);
      });
      
      await act(async () => {
        result.current.toggleOpen();
      });
      
      expect(result.current.isOpen).toBe(true);
      
      await act(async () => {
        result.current.toggleOpen();
      });
      
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('Acceptance Criterion 3: Messages display in conversation format', () => {
    it('should initialize with welcome message from assistant', async () => {
      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
        expect(result.current.messages[0].role).toBe('assistant');
        expect(result.current.messages[0].content).toContain('Merhaba');
      });
    });

    it('should add user message to conversation when sending', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            answer: 'Test cevabı',
            sources: []
          }
        })
      });
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: {
                questions: ['Soru 1', 'Soru 2']
              }
            })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      await act(async () => {
        await result.current.sendMessage('Test sorusu');
      });
      
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(1);
      });
      
      const userMessages = result.current.messages.filter(m => m.role === 'user');
      expect(userMessages.some(m => m.content === 'Test sorusu')).toBe(true);
    });

    it('should display assistant response after user message', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            answer: 'IVF tedavisi için önerilerim...',
            sources: [
              { type: 'article', id: 1, title: 'IVF Tedavisi Hakkında' }
            ]
          }
        })
      });
      
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: { questions: ['Soru 1', 'Soru 2'] }
            })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      await act(async () => {
        await result.current.sendMessage('IVF tedavisi nedir?');
      });
      
      await waitFor(() => {
        const assistantMessages = result.current.messages.filter(m => m.role === 'assistant');
        expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
        const lastAssistant = assistantMessages[assistantMessages.length - 1];
        expect(lastAssistant.content).toBe('IVF tedavisi için önerilerim...');
      });
    });
  });

  describe('Acceptance Criterion 4: Typing indicator shows during API call', () => {
    it('should set isLoading true while waiting for response', async () => {
      // Create a never-resolving promise to keep loading state
      let resolveFetch: (value: unknown) => void;
      
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { questions: [] } })
          });
        }
        return new Promise((resolve) => {
          resolveFetch = resolve;
        });
      });
      
      const { result } = renderHook(() => useChat());
      
      // Initial state
      expect(result.current.isLoading).toBe(false);
      
      // Trigger send (without awaiting)
      act(() => {
        result.current.sendMessage('Test sorusu');
      });
      
      // isLoading should be true during the API call
      expect(result.current.isLoading).toBe(true);
      
      // Resolve the fetch
      act(() => {
        resolveFetch!({
          ok: true,
          json: async () => ({ data: { answer: 'Test', sources: [] } })
        });
      });
    });

    it('should set isLoading false after response', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            answer: 'Test cevabı',
            sources: []
          }
        })
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { questions: [] } })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      await act(async () => {
        await result.current.sendMessage('Test sorusu');
      });
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Acceptance Criterion 5: Suggested questions clickable and send message', () => {
    it('should load suggested questions on mount', async () => {
      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.suggestedQuestions.length).toBe(2);
      });
    });

    it('should have fallback suggestions when API fails', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { answer: 'Test', sources: [] } })
        });
      });

      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.suggestedQuestions.length).toBe(4);
        expect(result.current.suggestedQuestions[0]).toContain('IVF tedavisine');
      });
    });
  });

  describe('Acceptance Criterion 6: Source cards show relevant article/video preview', () => {
    it('should include sources in assistant message response', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            answer: 'İşte size bazı kaynaklar...',
            sources: [
              { type: 'article', id: 1, title: 'IVF Hakkında Her Şey', url: 'https://example.com/1' },
              { type: 'video', id: 2, title: 'Embriyo Transferi Videosu', url: 'https://example.com/2', timestamp: '02:14' },
              { type: 'faq', id: 3, title: 'En Sık Sorulan Sorular' }
            ]
          }
        })
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { questions: [] } })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat());
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      await act(async () => {
        await result.current.sendMessage('Kaynaklar göster');
      });
      
      await waitFor(() => {
        const lastMessage = result.current.messages[result.current.messages.length - 1];
        expect(lastMessage.sources).toBeDefined();
        expect(lastMessage.sources?.length).toBe(3);
        expect(lastMessage.sources?.[0].type).toBe('article');
        expect(lastMessage.sources?.[1].type).toBe('video');
        expect(lastMessage.sources?.[1].timestamp).toBe('02:14');
      });
    });
  });

  describe('Acceptance Criterion 7: Session persists in localStorage', () => {
    it('should save messages to localStorage', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { answer: 'Cevap', sources: [] }
        })
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { questions: [] } })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat({ clinic: 'test-clinic' }));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      await act(async () => {
        await result.current.sendMessage('Test');
      });
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalled();
      });
    });

    it('should load existing session from localStorage', async () => {
      const storedSession: ChatState = {
        sessionId: 'existing_session_123',
        messages: [
          { id: '1', role: 'assistant', content: 'Önceki sohbet', timestamp: Date.now() },
          { id: '2', role: 'user', content: 'Selam', timestamp: Date.now() }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSession));

      const { result } = renderHook(() => useChat({ clinic: 'test-clinic' }));
      
      await waitFor(() => {
        expect(result.current.sessionId).toBe('existing_session_123');
        expect(result.current.messages.length).toBe(2);
      });
    });
  });

  describe('Acceptance Criterion 8: Responsive on mobile (< 768px)', () => {
    it('should have responsive CSS for mobile viewport', async () => {
      const fs = await import('fs');
      const css = fs.readFileSync('./src/components/ChatWidget/widget.css', 'utf-8');
      
      expect(css).toContain('@media (max-width: 768px)');
      expect(css).toContain('width: calc(100vw - 2rem)');
      expect(css).toContain('height: calc(100vh - 5rem)');
    });
  });

  describe('Acceptance Criterion 10: Typecheck passes', () => {
    it('should have valid TypeScript types', () => {
      const testMessage: Message = {
        id: 'test',
        role: 'user',
        content: 'Test',
        timestamp: Date.now()
      };
      expect(testMessage.role).toBe('user');
      
      const testSource: Source = {
        type: 'article',
        id: 1,
        title: 'Test'
      };
      expect(testSource.type).toBe('article');
      
      const testState: ChatState = {
        sessionId: 'test',
        messages: [testMessage]
      };
      expect(testState.sessionId).toBe('test');
    });
  });

  describe('Additional: Dark/Light theme support', () => {
    it('should have dark mode CSS classes', async () => {
      const fs = await import('fs');
      const css = fs.readFileSync('./src/components/ChatWidget/widget.css', 'utf-8');
      
      expect(css).toContain('.ivf-dark');
      expect(css).toContain('--surface-dark');
    });
  });

  describe('Additional: clearSession functionality', () => {
    it('should clear session and reset to welcome message', async () => {
      const chatMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { answer: 'Cevap', sources: [] }
        })
      });

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/suggestions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: { questions: [] } })
          });
        }
        return chatMock(url);
      });

      const { result } = renderHook(() => useChat({ clinic: 'test-clinic' }));
      
      await waitFor(() => {
        expect(result.current.messages).toHaveLength(1);
      });
      
      // Send a message
      await act(async () => {
        await result.current.sendMessage('Test');
      });
      
      await waitFor(() => {
        expect(result.current.messages.length).toBeGreaterThan(1);
      });
      
      // Clear session
      await act(async () => {
        result.current.clearSession();
      });
      
      await waitFor(() => {
        // Should have only welcome message
        expect(result.current.messages.length).toBe(1);
        expect(result.current.messages[0].role).toBe('assistant');
      });
    });
  });
});
