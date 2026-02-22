import { Pool } from 'pg';

export interface DailyStats {
  date: string;
  count: number;
}

export interface SentimentDistribution {
  sentiment: string;
  count: number;
  percentage: number;
}

export interface TopQuery {
  query: string;
  count: number;
}

export interface ConversationMessage {
  id: number;
  sessionId: string;
  role: string;
  content: string;
  sentiment: string;
  createdAt: string;
}

export interface PaginatedConversations {
  conversations: ConversationMessage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsSummary {
  daily: DailyStats[];
  totals: {
    conversations: number;
    messages: number;
    sessions: number;
  };
  sentimentDistribution: SentimentDistribution[];
  topQueries: TopQuery[];
}

export class StatsService {
  constructor(private pool: Pool) {}

  /**
   * Get daily conversation counts for the last N days
   */
  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const result = await this.pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT session_id) as count
       FROM conversations
       WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    return result.rows.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Get total counts for conversations, messages, and unique sessions
   */
  async getTotals(): Promise<{
    conversations: number;
    messages: number;
    sessions: number;
  }> {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as messages,
        COUNT(DISTINCT session_id) as sessions
       FROM conversations`
    );

    // Count conversations as sessions with user messages
    const conversationsResult = await this.pool.query(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM conversations
       WHERE role = 'user'`
    );

    return {
      conversations: parseInt(conversationsResult.rows[0].count, 10),
      messages: parseInt(result.rows[0].messages, 10),
      sessions: parseInt(result.rows[0].sessions, 10),
    };
  }

  /**
   * Get sentiment distribution across all conversations
   */
  async getSentimentDistribution(): Promise<SentimentDistribution[]> {
    const result = await this.pool.query(
      `SELECT 
        sentiment,
        COUNT(*) as count
       FROM conversations
       WHERE role = 'user' AND sentiment IS NOT NULL
       GROUP BY sentiment
       ORDER BY count DESC`
    );

    const total = result.rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    if (total === 0) {
      return [];
    }

    return result.rows.map((row) => ({
      sentiment: row.sentiment,
      count: parseInt(row.count, 10),
      percentage: Math.round((parseInt(row.count, 10) / total) * 1000) / 10,
    }));
  }

  /**
   * Get top queries from user messages
   * Extracts key phrases and counts occurrences
   */
  async getTopQueries(limit: number = 10): Promise<TopQuery[]> {
    // Get user messages and analyze for common query patterns
    const result = await this.pool.query(
      `SELECT content, COUNT(*) as count
       FROM conversations
       WHERE role = 'user' AND content IS NOT NULL
       GROUP BY content
       ORDER BY count DESC
       LIMIT $1`,
      [limit * 3] // Get more to allow for aggregation
    );

    // Simple aggregation: group similar queries by first 50 chars
    const queryMap = new Map<string, number>();

    for (const row of result.rows) {
      const content = row.content as string;
      const normalized = this.normalizeQuery(content);
      const existing = queryMap.get(normalized);
      if (existing) {
        queryMap.set(normalized, existing + parseInt(row.count, 10));
      } else {
        queryMap.set(normalized, parseInt(row.count, 10));
      }
    }

    // Convert to array and sort by count
    const queries = Array.from(queryMap.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return queries;
  }

  /**
   * Get paginated recent conversations
   * Returns anonymized conversation data (no PII)
   */
  async getRecentConversations(
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedConversations> {
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM conversations`
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get paginated conversations - anonymized (no session_id exposed directly)
    const result = await this.pool.query(
      `SELECT 
        id,
        session_id as "sessionId",
        role,
        content,
        sentiment,
        created_at as "createdAt"
       FROM conversations
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const conversations: ConversationMessage[] = result.rows.map((row) => ({
      id: row.id,
      sessionId: this.anonymizeSessionId(row.sessionId),
      role: row.role,
      content: row.content,
      sentiment: row.sentiment,
      createdAt: row.createdAt,
    }));

    return {
      conversations,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get full stats summary for admin dashboard
   */
  async getStatsSummary(days: number = 30): Promise<StatsSummary> {
    const [daily, totals, sentimentDistribution, topQueries] = await Promise.all([
      this.getDailyStats(days),
      this.getTotals(),
      this.getSentimentDistribution(),
      this.getTopQueries(10),
    ]);

    return {
      daily,
      totals,
      sentimentDistribution,
      topQueries,
    };
  }

  /**
   * Normalize a query for aggregation
   * Removes extra whitespace, lowercases, and truncates
   */
  private normalizeQuery(content: string): string {
    if (!content) return '';

    return content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
  }

  /**
   * Anonymize session ID for display
   * Shows only first 8 characters
   */
  private anonymizeSessionId(sessionId: string): string {
    if (!sessionId) return 'unknown';
    return sessionId.slice(0, 8) + '...';
  }
}
