import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatsService } from '../services/stats-service';

type MockQueryResult = {
  rows: Array<Record<string, string | number | null>>;
  command?: string;
  rowCount?: number;
};

type MockPool = {
  query: ReturnType<typeof vi.fn>;
};

describe('StatsService', () => {
  let mockPool: MockPool;
  let statsService: StatsService;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    };
    statsService = new StatsService(mockPool as unknown as import('pg').Pool);
  });

  describe('getDailyStats', () => {
    it('should return daily stats for the specified number of days', async () => {
      const mockRows: MockQueryResult = {
        rows: [
          { date: '2024-01-01', count: '5' },
          { date: '2024-01-02', count: '10' },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockRows);

      const result = await statsService.getDailyStats(30);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ date: '2024-01-01', count: 5 });
      expect(result[1]).toEqual({ date: '2024-01-02', count: 10 });
    });

    it('should return empty array when no data', async () => {
      const mockResult: MockQueryResult = { rows: [] };
      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await statsService.getDailyStats(30);

      expect(result).toEqual([]);
    });
  });

  describe('getTotals', () => {
    it('should return total counts', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ messages: '100', sessions: '20' }],
        } as MockQueryResult)
        .mockResolvedValueOnce({
          rows: [{ count: '15' }],
        } as MockQueryResult);

      const result = await statsService.getTotals();

      expect(result).toEqual({
        conversations: 15,
        messages: 100,
        sessions: 20,
      });
    });
  });

  describe('getSentimentDistribution', () => {
    it('should return sentiment distribution with percentages', async () => {
      const mockResult: MockQueryResult = {
        rows: [
          { sentiment: 'calm', count: '50' },
          { sentiment: 'anxious', count: '30' },
          { sentiment: 'fearful', count: '15' },
          { sentiment: 'hopeful', count: '5' },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await statsService.getSentimentDistribution();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ sentiment: 'calm', count: 50, percentage: 50 });
      expect(result[1]).toEqual({ sentiment: 'anxious', count: 30, percentage: 30 });
      expect(result[2]).toEqual({ sentiment: 'fearful', count: 15, percentage: 15 });
      expect(result[3]).toEqual({ sentiment: 'hopeful', count: 5, percentage: 5 });
    });

    it('should return empty array when no sentiment data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as MockQueryResult);

      const result = await statsService.getSentimentDistribution();

      expect(result).toEqual([]);
    });
  });

  describe('getTopQueries', () => {
    it('should return top queries aggregated by content', async () => {
      const mockResult: MockQueryResult = {
        rows: [
          { content: 'tüp bebek nedir', count: '10' },
          { content: 'tüp bebek nasıl yapılır', count: '8' },
          { content: 'ivf tedavisi', count: '5' },
        ],
      };

      mockPool.query.mockResolvedValueOnce(mockResult);

      const result = await statsService.getTopQueries(10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('query');
      expect(result[0]).toHaveProperty('count');
    });
  });

  describe('getRecentConversations', () => {
    it('should return paginated conversations with anonymized session IDs', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '100' }],
        } as MockQueryResult)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              sessionId: 'abc123def456',
              role: 'user',
              content: 'Merhaba',
              sentiment: 'calm',
              createdAt: '2024-01-01T10:00:00Z',
            },
            {
              id: 2,
              sessionId: 'abc123def456',
              role: 'assistant',
              content: 'Merhaba, size nasıl yardımcı olabilirim?',
              sentiment: null,
              createdAt: '2024-01-01T10:00:05Z',
            },
          ],
        } as MockQueryResult);

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[0].sessionId).toBe('abc123de...'); // Anonymized
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(100);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should calculate correct total pages', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '95' }],
        } as MockQueryResult)
        .mockResolvedValueOnce({
          rows: [],
        } as MockQueryResult);

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.meta.totalPages).toBe(5); // ceil(95/20) = 5
    });
  });

  describe('getStatsSummary', () => {
    it('should return complete stats summary', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ date: '2024-01-01', count: '5' }],
        } as MockQueryResult) // daily stats
        .mockResolvedValueOnce({
          rows: [{ messages: '100', sessions: '20' }],
        } as MockQueryResult) // totals
        .mockResolvedValueOnce({
          rows: [{ count: '15' }],
        } as MockQueryResult) // conversations count
        .mockResolvedValueOnce({
          rows: [{ sentiment: 'calm', count: '50' }],
        } as MockQueryResult) // sentiment
        .mockResolvedValueOnce({
          rows: [{ content: 'test', count: '5' }],
        } as MockQueryResult); // top queries

      const result = await statsService.getStatsSummary(30);

      expect(result).toHaveProperty('daily');
      expect(result).toHaveProperty('totals');
      expect(result).toHaveProperty('sentimentDistribution');
      expect(result).toHaveProperty('topQueries');
    });
  });
});
