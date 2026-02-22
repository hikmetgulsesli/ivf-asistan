import { Pool } from 'pg';

let pool: Pool | null = null;

export function setPool(p: Pool) {
  pool = pool || p;
}

export function initVideoService(p: Pool) {
  pool = p;
}

function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

export interface Video {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  key_topics: string[];
  timestamps: Array<{ time: string; topic: string }>;
  category: string;
  duration_seconds: number | null;
  embedding: number[] | null;
  analysis_status: 'pending' | 'processing' | 'done' | 'failed';
  created_at: string;
}

export interface CreateVideoInput {
  title: string;
  url: string;
  category: string;
  duration_seconds?: number;
}

export interface UpdateVideoInput {
  title?: string;
  url?: string;
  summary?: string;
  key_topics?: string[];
  timestamps?: Array<{ time: string; topic: string }>;
  category?: string;
  duration_seconds?: number;
  analysis_status?: 'pending' | 'processing' | 'done' | 'failed';
}

export interface VideoListParams {
  page?: number;
  limit?: number;
  category?: string;
  analysis_status?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class VideoService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async createVideo(input: CreateVideoInput): Promise<Video> {
    const result = await this.pool.query(
      `INSERT INTO videos (title, url, category, duration_seconds, analysis_status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [input.title, input.url, input.category, input.duration_seconds || null]
    );
    
    return this.mapRowToVideo(result.rows[0]);
  }

  async getVideoById(id: number): Promise<Video | null> {
    const result = await this.pool.query('SELECT * FROM videos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) return null;
    
    return this.mapRowToVideo(result.rows[0]);
  }

  async listVideos(params: VideoListParams = {}): Promise<PaginatedResult<Video>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const queryParams: unknown[] = [];
    
    if (params.category) {
      whereClause = 'WHERE category = $' + (queryParams.length + 1);
      queryParams.push(params.category);
    }
    
    if (params.analysis_status) {
      if (whereClause) {
        whereClause += ' AND analysis_status = $' + (queryParams.length + 1);
      } else {
        whereClause = 'WHERE analysis_status = $' + (queryParams.length + 1);
      }
      queryParams.push(params.analysis_status);
    }
    
    // Get total count
    const countResult = await this.pool.query(`SELECT COUNT(*) as count FROM videos ${whereClause}`);
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated data
    const dataResult = await this.pool.query(
      `SELECT * FROM videos ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );
    
    return {
      data: dataResult.rows.map(row => this.mapRowToVideo(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateVideo(id: number, input: UpdateVideoInput): Promise<Video | null> {
    const existing = await this.getVideoById(id);
    if (!existing) return null;
    
    const updates: string[] = [];
    const params: unknown[] = [];
    
    if (input.title !== undefined) {
      updates.push('title = $' + (params.length + 1));
      params.push(input.title);
    }
    if (input.url !== undefined) {
      updates.push('url = $' + (params.length + 1));
      params.push(input.url);
    }
    if (input.summary !== undefined) {
      updates.push('summary = $' + (params.length + 1));
      params.push(input.summary);
    }
    if (input.key_topics !== undefined) {
      updates.push('key_topics = $' + (params.length + 1));
      params.push(JSON.stringify(input.key_topics));
    }
    if (input.timestamps !== undefined) {
      updates.push('timestamps = $' + (params.length + 1));
      params.push(JSON.stringify(input.timestamps));
    }
    if (input.category !== undefined) {
      updates.push('category = $' + (params.length + 1));
      params.push(input.category);
    }
    if (input.duration_seconds !== undefined) {
      updates.push('duration_seconds = $' + (params.length + 1));
      params.push(input.duration_seconds);
    }
    if (input.analysis_status !== undefined) {
      updates.push('analysis_status = $' + (params.length + 1));
      params.push(input.analysis_status);
    }
    
    if (updates.length === 0) return existing;
    
    params.push(id);
    
    await this.pool.query(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );
    
    return this.getVideoById(id);
  }

  async deleteVideo(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM videos WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getVideoAnalysisStatus(id: number): Promise<{ id: number; analysis_status: string } | null> {
    const video = await this.getVideoById(id);
    if (!video) return null;
    return {
      id: video.id,
      analysis_status: video.analysis_status,
    };
  }

  private mapRowToVideo(row: Record<string, unknown>): Video {
    return {
      ...row,
      key_topics: typeof row.key_topics === 'string' ? JSON.parse(row.key_topics) : row.key_topics || [],
      timestamps: typeof row.timestamps === 'string' ? JSON.parse(row.timestamps) : row.timestamps || [],
      embedding: row.embedding ? (typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding) : null,
    } as unknown as Video;
  }
}

// Also export functions for direct use
export async function createVideo(input: CreateVideoInput): Promise<Video> {
  const service = new VideoService(getPool());
  return service.createVideo(input);
}

export async function getVideoById(id: number): Promise<Video | null> {
  const service = new VideoService(getPool());
  return service.getVideoById(id);
}

export async function listVideos(params: VideoListParams = {}): Promise<PaginatedResult<Video>> {
  const service = new VideoService(getPool());
  return service.listVideos(params);
}

export async function updateVideo(id: number, input: UpdateVideoInput): Promise<Video | null> {
  const service = new VideoService(getPool());
  return service.updateVideo(id, input);
}

export async function deleteVideo(id: number): Promise<boolean> {
  const service = new VideoService(getPool());
  return service.deleteVideo(id);
}

export async function getVideoAnalysisStatus(id: number): Promise<{ id: number; analysis_status: string } | null> {
  const service = new VideoService(getPool());
  return service.getVideoAnalysisStatus(id);
}
