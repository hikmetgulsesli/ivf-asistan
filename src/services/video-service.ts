import { getDb } from '../db/connection.js';

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

export function createVideo(input: CreateVideoInput): Video {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO videos (title, url, category, duration_seconds, analysis_status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  
  const result = stmt.run(
    input.title,
    input.url,
    input.category,
    input.duration_seconds || null
  );
  
  return getVideoById(result.lastInsertRowid as number)!;
}

export function getVideoById(id: number): Video | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM videos WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  
  if (!row) return null;
  
  return {
    ...row,
    key_topics: JSON.parse(String(row.key_topics || '[]')),
    timestamps: JSON.parse(String(row.timestamps || '[]')),
    embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
  } as unknown as Video;
}

export function listVideos(params: VideoListParams = {}): PaginatedResult<Video> {
  const db = getDb();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;
  
  let whereClause = '';
  const queryParams: unknown[] = [];
  
  if (params.category) {
    whereClause = 'WHERE category = ?';
    queryParams.push(params.category);
  }
  
  if (params.analysis_status) {
    if (whereClause) {
      whereClause += ' AND analysis_status = ?';
    } else {
      whereClause = 'WHERE analysis_status = ?';
    }
    queryParams.push(params.analysis_status);
  }
  
  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM videos ${whereClause}`);
  const countResult = countStmt.get(...queryParams) as { count: number };
  const total = countResult.count;
  
  // Get paginated data
  const dataStmt = db.prepare(`
    SELECT * FROM videos ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = dataStmt.all(...queryParams, limit, offset) as Record<string, unknown>[];
  
  return {
    data: rows.map(row => ({
      ...row,
      key_topics: JSON.parse(String(row.key_topics || '[]')),
      timestamps: JSON.parse(String(row.timestamps || '[]')),
      embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
    })) as unknown as Video[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function updateVideo(id: number, input: UpdateVideoInput): Video | null {
  const db = getDb();
  const existing = getVideoById(id);
  if (!existing) return null;
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }
  if (input.url !== undefined) {
    updates.push('url = ?');
    params.push(input.url);
  }
  if (input.summary !== undefined) {
    updates.push('summary = ?');
    params.push(input.summary);
  }
  if (input.key_topics !== undefined) {
    updates.push('key_topics = ?');
    params.push(JSON.stringify(input.key_topics));
  }
  if (input.timestamps !== undefined) {
    updates.push('timestamps = ?');
    params.push(JSON.stringify(input.timestamps));
  }
  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }
  if (input.duration_seconds !== undefined) {
    updates.push('duration_seconds = ?');
    params.push(input.duration_seconds);
  }
  if (input.analysis_status !== undefined) {
    updates.push('analysis_status = ?');
    params.push(input.analysis_status);
  }
  
  if (updates.length === 0) return existing;
  
  params.push(id);
  
  const stmt = db.prepare(`
    UPDATE videos SET ${updates.join(', ')} WHERE id = ?
  `);
  
  stmt.run(...params);
  
  return getVideoById(id);
}

export function deleteVideo(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM videos WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getVideoAnalysisStatus(id: number): { id: number; analysis_status: string } | null {
  const video = getVideoById(id);
  if (!video) return null;
  return {
    id: video.id,
    analysis_status: video.analysis_status,
  };
}
