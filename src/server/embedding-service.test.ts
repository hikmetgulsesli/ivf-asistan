import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Embedding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
          usage: { prompt_tokens: 10, total_tokens: 15 },
        }),
      });

      vi.resetModules();
      
      const originalEnv = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = 'test-api-key';
      process.env.MINIMAX_API_HOST = 'https://api.minimax.io';
      
      const { generateEmbedding } = await import('../services/embedding-service.js');
      
      const result = await generateEmbedding('test text');

      expect(result.embedding).toEqual(mockEmbedding);
      expect(result.usage.prompt_tokens).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.minimax.io/v1/text/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
      
      process.env.MINIMAX_API_KEY = originalEnv;
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      vi.resetModules();
      
      const originalEnv = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = 'test-api-key';

      const { generateEmbedding } = await import('../services/embedding-service.js');
      
      await expect(generateEmbedding('test text')).rejects.toThrow('MiniMax embedding API error: 401');
      
      process.env.MINIMAX_API_KEY = originalEnv;
    });

    it('should throw error on invalid response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      vi.resetModules();
      
      const originalEnv = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = 'test-api-key';

      const { generateEmbedding } = await import('../services/embedding-service.js');
      
      await expect(generateEmbedding('test text')).rejects.toThrow('Invalid embedding response');
      
      process.env.MINIMAX_API_KEY = originalEnv;
    });
  });

  describe('generateEmbeddingWithTiming', () => {
    it('should return timing information', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
          usage: { prompt_tokens: 5, total_tokens: 8 },
        }),
      });

      vi.resetModules();
      
      const originalEnv = process.env.MINIMAX_API_KEY;
      process.env.MINIMAX_API_KEY = 'test-api-key';

      const { generateEmbeddingWithTiming } = await import('../services/embedding-service.js');
      
      const start = Date.now();
      const result = await generateEmbeddingWithTiming('test text');
      const elapsed = Date.now() - start;

      expect(result.result.embedding).toEqual(mockEmbedding);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.durationMs).toBeLessThanOrEqual(elapsed + 10);
      
      process.env.MINIMAX_API_KEY = originalEnv;
    });
  });
});
