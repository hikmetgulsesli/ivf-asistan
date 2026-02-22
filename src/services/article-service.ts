import { getDb } from '../db/connection.js';

export interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding: number[] | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface UpdateArticleInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface ArticleListParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
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

export function createArticle(input: CreateArticleInput): Article {
  const db = getDb();
  const tags = JSON.stringify(input.tags || []);
  
  const stmt = db.prepare(`
    INSERT INTO articles (title, content, category, tags, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    input.title,
    input.content,
    input.category,
    tags,
    input.status || 'draft'
  );
  
  return getArticleById(result.lastInsertRowid as number)!;
}

export function getArticleById(id: number): Article | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM articles WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  
  if (!row) return null;
  
  return {
    ...row,
    tags: JSON.parse(String(row.tags || '[]')),
    embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
  } as unknown as Article;
}

export function listArticles(params: ArticleListParams = {}): PaginatedResult<Article> {
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
  
  if (params.status) {
    if (whereClause) {
      whereClause += ' AND status = ?';
    } else {
      whereClause = 'WHERE status = ?';
    }
    queryParams.push(params.status);
  }
  
  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM articles ${whereClause}`);
  const countResult = countStmt.get(...queryParams) as { count: number };
  const total = countResult.count;
  
  // Get paginated data
  const dataStmt = db.prepare(`
    SELECT * FROM articles ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = dataStmt.all(...queryParams, limit, offset) as Record<string, unknown>[];
  
  return {
    data: rows.map(row => ({
      ...row,
      tags: JSON.parse(String(row.tags || '[]')),
      embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
    })) as unknown as Article[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function updateArticle(id: number, input: UpdateArticleInput): Article | null {
  const db = getDb();
  const existing = getArticleById(id);
  if (!existing) return null;
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  if (input.title !== undefined) {
    updates.push('title = ?');
    params.push(input.title);
  }
  if (input.content !== undefined) {
    updates.push('content = ?');
    params.push(input.content);
  }
  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }
  if (input.tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(input.tags));
  }
  if (input.status !== undefined) {
    updates.push('status = ?');
    params.push(input.status);
  }
  
  if (updates.length === 0) return existing;
  
  updates.push("updated_at = datetime('now')");
  params.push(id);
  
  const stmt = db.prepare(`
    UPDATE articles SET ${updates.join(', ')} WHERE id = ?
  `);
  
  stmt.run(...params);
  
  return getArticleById(id);
}

export function deleteArticle(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM articles WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function getCategories(): string[] {
  const db = getDb();
  const stmt = db.prepare('SELECT DISTINCT category FROM articles ORDER BY category');
  const rows = stmt.all() as { category: string }[];
  return rows.map(row => row.category);
}
