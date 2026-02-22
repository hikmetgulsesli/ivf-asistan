import crypto from 'crypto';
import { Pool } from 'pg';

export interface CacheEntry {
  query_text: string;
  response: string;
  sources: Array<{ type: 'article' | 'faq' | 'video'; id: number; title: string; url?: string; category: string }>;
  hit_count: number;
  created_at: Date;
  expires_at: Date;
}

export class CacheService {
  private pool: Pool;
  private ttlMs: number;

  constructor(pool: Pool, ttlHours: number = 24) {
    this.pool = pool;
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  private hashQuery(query: string): string {
    return crypto.createHash('sha256').update(query.trim().toLowerCase()).digest('hex');
  }

  async get(query: string): Promise<CacheEntry | null> {
    const queryHash = this.hashQuery(query);
    const result = await this.pool.query(
      'SELECT id, query_text, response, sources, hit_count, created_at, expires_at FROM response_cache WHERE query_hash = $1 AND expires_at > NOW()',
      [queryHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    await this.pool.query(
      'UPDATE response_cache SET hit_count = response_cache.hit_count + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    return {
      query_text: result.rows[0].query_text,
      response: result.rows[0].response,
      sources: result.rows[0].sources,
      hit_count: result.rows[0].hit_count + 1,
      created_at: result.rows[0].created_at,
      expires_at: result.rows[0].expires_at,
    };
  }

  async set(query: string, response: string, sources: Array<{ type: string; id: number; title: string; url?: string }>): Promise<void> {
    const queryHash = this.hashQuery(query);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.pool.query(
      `INSERT INTO response_cache (query_hash, query_text, response, sources, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (query_hash) DO UPDATE SET
         response = EXCLUDED.response,
         sources = EXCLUDED.sources,
         expires_at = EXCLUDED.expires_at,
         hit_count = response_cache.hit_count + 1`,
      [queryHash, query, response, JSON.stringify(sources), expiresAt]
    );
  }

  async invalidate(pattern?: string): Promise<number> {
    if (pattern) {
      const result = await this.pool.query(
        'DELETE FROM response_cache WHERE query_text ILIKE $1',
        [`%${pattern}%`]
      );
      return result.rowCount || 0;
    }

    const result = await this.pool.query('DELETE FROM response_cache');
    return result.rowCount || 0;
  }

  async getStats(): Promise<{ totalEntries: number; totalHits: number; avgHits: number }> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as total, COALESCE(SUM(hit_count), 0) as total_hits FROM response_cache'
    );

    const totalEntries = parseInt(result.rows[0].total);
    const totalHits = parseInt(result.rows[0].total_hits);
    const avgHits = totalEntries > 0 ? totalHits / totalEntries : 0;

    return {
      totalEntries,
      totalHits,
      avgHits: Math.round(avgHits * 100) / 100,
    };
  }
}
