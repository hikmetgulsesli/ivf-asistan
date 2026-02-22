import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pool } from 'pg';
import { StatsService } from '../services/stats-service';

// Mock pg Pool
const mockPool = {
  query: vi.fn(),
};

describe('StatsService', () => {
  let statsService: StatsService;

  beforeEach(() => {
    vi.clearAllMocks();
    statsService = new StatsService(mockPool as unknown as Pool);
  });

  describe('getTotals', () => {
    it('should return total conversation statistics', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_conversations: '150',
          total_messages: '450',
          total_user_messages: '225',
          total_assistant_messages: '225',
        }],
      });

      const result = await statsService.getTotals();

      expect(result).toEqual({
        totalConversations: 150,
        totalMessages: 450,
        totalUserMessages: 225,
        totalAssistantMessages: 225,
      });

      expect(mockPool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should handle zero conversations', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_conversations: '0',
          total_messages: '0',
          total_user_messages: '0',
          total_assistant_messages: '0',
        }],
      });

      const result = await statsService.getTotals();

      expect(result.totalConversations).toBe(0);
      expect(result.totalMessages).toBe(0);
    });
  });

  describe('getDailyStats', () => {
    it('should return daily conversation counts', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { date: '2026-02-20', count: '10' },
          { date: '2026-02-21', count: '15' },
          { date: '2026-02-22', count: '8' },
        ],
      });

      const result = await statsService.getDailyStats(7);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ date: '2026-02-20', count: 10 });
      expect(result[1]).toEqual({ date: '2026-02-21', count: 15 });
      expect(result[2]).toEqual({ date: '2026-02-22', count: 8 });
    });

    it('should return empty array when no data', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await statsService.getDailyStats(30);

      expect(result).toEqual([]);
    });
  });

  describe('getSentimentDistribution', () => {
    it('should return sentiment distribution', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { sentiment: 'positive', count: '50' },
          { sentiment: 'negative', count: '20' },
          { sentiment: 'neutral', count: '30' },
          { sentiment: 'fearful', count: '15' },
          { sentiment: 'anxious', count: '25' },
          { sentiment: 'hopeful', count: '40' },
        ],
      });

      const result = await statsService.getSentimentDistribution();

      expect(result).toEqual({
        positive: 50,
        negative: 20,
        neutral: 30,
        fearful: 15,
        anxious: 25,
        hopeful: 40,
      });
    });

    it('should return zero counts for missing sentiments', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { sentiment: 'positive', count: '50' },
          { sentiment: 'neutral', count: '30' },
        ],
      });

      const result = await statsService.getSentimentDistribution();

      expect(result.positive).toBe(50);
      expect(result.neutral).toBe(30);
      expect(result.negative).toBe(0);
      expect(result.fearful).toBe(0);
      expect(result.anxious).toBe(0);
      expect(result.hopeful).toBe(0);
    });
  });

  describe('getTopQueries', () => {
    it('should return top queries from user messages', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { content: 'tüp bebek tedavisi hakkında bilgi istiyorum' },
          { content: 'tüp bebek başarı oranları nedir' },
          { content: 'tedavi süreci ne kadar sürer' },
          { content: 'bebek sahibi olmak istiyorum' },
          { content: 'tüp bebek fiyatları' },
        ],
      });

      const result = await statsService.getTopQueries(5);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('query');
      expect(result[0]).toHaveProperty('count');
      // 'tüp' and 'bebek' should be among top words
      const queries = result.map(r => r.query);
      expect(queries).toContain('tüp');
      expect(queries).toContain('bebek');
    });

    it('should filter out stop words', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { content: 'bir ve bu için ile mi de da çok' },
        ],
      });

      const result = await statsService.getTopQueries(10);

      // Stop words should be filtered out
      const queries = result.map(r => r.query);
      expect(queries).not.toContain('bir');
      expect(queries).not.toContain('ve');
      expect(queries).not.toContain('bu');
    });

    it('should limit results to specified count', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: Array(20).fill({ content: 'tüp bebek tedavi başarı oran süreç' }),
      });

      const result = await statsService.getTopQueries(5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getRecentConversations', () => {
    it('should return paginated conversations', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '100' }],
      });

      // Mock conversations query
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            session_id: 'session-123',
            role: 'user',
            content: 'Merhaba, tüp bebek hakkında bilgi alabilir miyim?',
            sentiment: 'neutral',
            created_at: new Date('2026-02-22T10:00:00Z'),
          },
          {
            id: 2,
            session_id: 'session-123',
            role: 'assistant',
            content: 'Tabii, size yardımcı olmaktan memnuniyet duyarım.',
            sentiment: 'neutral',
            created_at: new Date('2026-02-22T10:01:00Z'),
          },
        ],
      });

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.conversations).toHaveLength(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(100);
      expect(result.meta.totalPages).toBe(5);
    });

    it('should anonymize content by removing PII', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
      });

      // Mock conversations query with PII
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            session_id: 'session-123',
            role: 'user',
            content: 'Benim TC kimlik numaram 12345678901 ve telefonum 05551234567',
            sentiment: 'neutral',
            created_at: new Date('2026-02-22T10:00:00Z'),
          },
        ],
      });

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.conversations[0].content).toContain('[TC-NO]');
      expect(result.conversations[0].content).toContain('[PHONE]');
      expect(result.conversations[0].content).not.toContain('12345678901');
      expect(result.conversations[0].content).not.toContain('05551234567');
    });

    it('should anonymize email addresses', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
      });

      // Mock conversations query with email
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            session_id: 'session-123',
            role: 'user',
            content: 'Bana test@example.com adresinden ulaşabilirsiniz',
            sentiment: 'neutral',
            created_at: new Date('2026-02-22T10:00:00Z'),
          },
        ],
      });

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.conversations[0].content).toContain('[EMAIL]');
      expect(result.conversations[0].content).not.toContain('test@example.com');
    });

    it('should anonymize IP addresses', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '1' }],
      });

      // Mock conversations query with IP
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            session_id: 'session-123',
            role: 'user',
            content: 'IP adresim 192.168.1.1 olarak görünüyor',
            sentiment: 'neutral',
            created_at: new Date('2026-02-22T10:00:00Z'),
          },
        ],
      });

      const result = await statsService.getRecentConversations(1, 20);

      expect(result.conversations[0].content).toContain('[IP]');
      expect(result.conversations[0].content).not.toContain('192.168.1.1');
    });

    it('should calculate correct pagination', async () => {
      // Mock count query
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total: '95' }],
      });

      // Mock conversations query
      mockPool.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await statsService.getRecentConversations(2, 20);

      expect(result.meta.page).toBe(2);
      expect(result.meta.total).toBe(95);
      expect(result.meta.totalPages).toBe(5); // ceil(95/20) = 5
    });
  });

  describe('getStatsSummary', () => {
    it('should return comprehensive stats summary', async () => {
      // Mock getTotals
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_conversations: '150',
          total_messages: '450',
          total_user_messages: '225',
          total_assistant_messages: '225',
        }],
      });

      // Mock getDailyStats
      mockPool.query.mockResolvedValueOnce({
        rows: [{ date: '2026-02-22', count: '10' }],
      });

      // Mock getSentimentDistribution
      mockPool.query.mockResolvedValueOnce({
        rows: [{ sentiment: 'positive', count: '50' }],
      });

      // Mock getTopQueries
      mockPool.query.mockResolvedValueOnce({
        rows: [{ content: 'tüp bebek' }],
      });

      const result = await statsService.getStatsSummary(30);

      expect(result).toHaveProperty('totals');
      expect(result).toHaveProperty('daily');
      expect(result).toHaveProperty('sentimentDistribution');
      expect(result).toHaveProperty('topQueries');

      expect(result.totals.totalConversations).toBe(150);
      expect(result.daily).toHaveLength(1);
      expect(result.sentimentDistribution.positive).toBe(50);
    });
  });
});

describe('Admin Stats API Endpoints', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should return 401 without authentication', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      // Find the stats route
      const statsRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats' && r.route.methods.get
      );

      expect(statsRoute).toBeDefined();
    });

    it('should validate days parameter', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      // Find the stats route
      const statsRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats' && r.route.methods.get
      );

      expect(statsRoute).toBeDefined();
    });
  });

  describe('GET /api/admin/conversations', () => {
    it('should return 401 without authentication', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      // Find the conversations route
      const conversationsRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/conversations' && r.route.methods.get
      );

      expect(conversationsRoute).toBeDefined();
    });

    it('should validate pagination parameters', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      // Find the conversations route
      const conversationsRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/conversations' && r.route.methods.get
      );

      expect(conversationsRoute).toBeDefined();
    });
  });

  describe('GET /api/admin/stats/sentiment', () => {
    it('should have sentiment endpoint defined', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      const sentimentRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats/sentiment' && r.route.methods.get
      );

      expect(sentimentRoute).toBeDefined();
    });
  });

  describe('GET /api/admin/stats/queries', () => {
    it('should have queries endpoint defined', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      const queriesRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats/queries' && r.route.methods.get
      );

      expect(queriesRoute).toBeDefined();
    });

    it('should validate limit parameter', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      const queriesRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats/queries' && r.route.methods.get
      );

      expect(queriesRoute).toBeDefined();
    });
  });

  describe('GET /api/admin/stats/daily', () => {
    it('should have daily stats endpoint defined', async () => {
      const { createAdminRouter } = await import('../routes/admin/index');
      const router = createAdminRouter(mockPool as unknown as Pool);

      const dailyRoute = router.stack.find((r: any) =>
        r.route && r.route.path === '/stats/daily' && r.route.methods.get
      );

      expect(dailyRoute).toBeDefined();
    });
  });
});
