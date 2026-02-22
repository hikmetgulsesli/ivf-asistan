import { Pool } from 'pg';

export interface DailyStat {
  date: string;
  count: number;
}

export interface SentimentDistribution {
  positive: number;
  negative: number;
  neutral: number;
  fearful: number;
  anxious: number;
  hopeful: number;
}

export interface TopQuery {
  query: string;
  count: number;
}

export interface ConversationRecord {
  id: number;
  session_id: string;
  role: string;
  content: string;
  sentiment: string;
  created_at: string;
}

export interface PaginatedConversations {
  conversations: ConversationRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StatsSummary {
  totals: {
    totalConversations: number;
    totalMessages: number;
    totalUserMessages: number;
    totalAssistantMessages: number;
  };
  daily: DailyStat[];
  sentimentDistribution: SentimentDistribution;
  topQueries: TopQuery[];
}

export class StatsService {
  constructor(private pool: Pool) {}

  /**
   * Get comprehensive stats summary for the dashboard
   */
  async getStatsSummary(days: number = 30): Promise<StatsSummary> {
    const [totals, daily, sentimentDistribution, topQueries] = await Promise.all([
      this.getTotals(),
      this.getDailyStats(days),
      this.getSentimentDistribution(),
      this.getTopQueries(10),
    ]);

    return {
      totals,
      daily,
      sentimentDistribution,
      topQueries,
    };
  }

  /**
   * Get total conversation statistics
   */
  async getTotals(): Promise<StatsSummary['totals']> {
    const result = await this.pool.query(`
      SELECT 
        COUNT(DISTINCT session_id) as total_conversations,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE role = 'user') as total_user_messages,
        COUNT(*) FILTER (WHERE role = 'assistant') as total_assistant_messages
      FROM conversations
    `);

    const row = result.rows[0];
    return {
      totalConversations: parseInt(row.total_conversations, 10),
      totalMessages: parseInt(row.total_messages, 10),
      totalUserMessages: parseInt(row.total_user_messages, 10),
      totalAssistantMessages: parseInt(row.total_assistant_messages, 10),
    };
  }

  /**
   * Get daily conversation counts for the last N days
   */
  async getDailyStats(days: number = 30): Promise<DailyStat[]> {
    const result = await this.pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT session_id) as count
      FROM conversations
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    return result.rows.map((row: { date: string; count: string }) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));
  }

  /**
   * Get sentiment distribution across all conversations
   */
  async getSentimentDistribution(): Promise<SentimentDistribution> {
    const result = await this.pool.query(`
      SELECT 
        sentiment,
        COUNT(*) as count
      FROM conversations
      WHERE role = 'user'
      GROUP BY sentiment
    `);

    const distribution: SentimentDistribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
      fearful: 0,
      anxious: 0,
      hopeful: 0,
    };

    for (const row of result.rows) {
      const sentiment = row.sentiment as keyof SentimentDistribution;
      if (sentiment in distribution) {
        distribution[sentiment] = parseInt(row.count, 10);
      }
    }

    return distribution;
  }

  /**
   * Get top queries from user messages
   * Extracts common keywords and phrases from user messages
   */
  async getTopQueries(limit: number = 10): Promise<TopQuery[]> {
    // Get all user messages from recent conversations
    const result = await this.pool.query(`
      SELECT content
      FROM conversations
      WHERE role = 'user'
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    // Simple keyword extraction - count word frequencies
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      'bir', 've', 'bu', 'için', 'ile', 'mi', 'de', 'da', 'çok', 'ama', 'ben', 'sen', 'o',
      'biz', 'siz', 'onlar', 'ne', 'nasıl', 'neden', 'nerede', 'ne zaman', 'kim', 'hangi',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against',
      'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
      'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
    ]);

    for (const row of result.rows) {
      const content = row.content.toLowerCase();
      // Extract words (Turkish and English)
      const words = content.match(/[a-zçğıöşüâîû]+/g) || [];
      
      for (const word of words) {
        if (word.length > 2 && !stopWords.has(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      }
    }

    // Sort by frequency and return top queries
    const sortedWords = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sortedWords.map(([query, count]) => ({
      query,
      count,
    }));
  }

  /**
   * Get paginated recent conversations (anonymized, no PII)
   */
  async getRecentConversations(page: number = 1, limit: number = 20): Promise<PaginatedConversations> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.pool.query(`
      SELECT COUNT(*) as total
      FROM conversations
    `);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get conversations - anonymized (no PII like names, IPs, TC numbers)
    const result = await this.pool.query(`
      SELECT 
        id,
        session_id,
        role,
        content,
        sentiment,
        created_at
      FROM conversations
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const conversations: ConversationRecord[] = result.rows.map((row: {
      id: number;
      session_id: string;
      role: string;
      content: string;
      sentiment: string;
      created_at: Date;
    }) => ({
      id: row.id,
      session_id: row.session_id,
      role: row.role,
      content: this.anonymizeContent(row.content),
      sentiment: row.sentiment,
      created_at: row.created_at.toISOString(),
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
   * Anonymize content by removing potential PII
   * - Names (simple heuristic)
   * - TC numbers (Turkish ID)
   * - Phone numbers
   * - Email addresses
   * - IP addresses
   */
  private anonymizeContent(content: string): string {
    let anonymized = content;

    // Remove phone numbers FIRST (before TC numbers to avoid conflicts)
    // Turkish mobile numbers: 05xx xxx xxxx or +90 5xx xxx xxxx
    anonymized = anonymized.replace(/\b(?:\+?90[-\s]?)?0?5\d{2}[-\s]?\d{3}[-\s]?\d{4}\b/g, '[PHONE]');

    // Remove TC numbers (11 digits) - must be exactly 11 digits
    anonymized = anonymized.replace(/\b\d{11}\b/g, '[TC-NO]');

    // Remove email addresses
    anonymized = anonymized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Remove IP addresses
    anonymized = anonymized.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');

    // Remove potential names (capitalized words that look like names)
    // This is a simple heuristic - removes standalone capitalized words
    anonymized = anonymized.replace(/\b[A-Z][a-z]+\b/g, (match) => {
      // Keep common words that might be capitalized
      const commonWords = ['Ivf', 'Tüp', 'Bebek', 'Doktor', 'Hastane', 'Tedavi', 'İlaç', 'Test', 'Sonuç'];
      if (commonWords.includes(match)) return match;
      return '[NAME]';
    });

    return anonymized;
  }
}
