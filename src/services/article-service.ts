import { Pool } from 'pg';

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

export async function createArticle(pool: Pool, input: CreateArticleInput): Promise<Article> {
  const tags = input.tags || [];
  const status = input.status || 'draft';

  const result = await pool.query(
    `INSERT INTO articles (title, content, category, tags, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.title, input.content, input.category, tags, status]
  );

  const row = result.rows[0];
  return {
    ...row,
    tags: row.tags || [],
    embedding: row.embedding || null,
  } as Article;
}

export async function getArticleById(pool: Pool, id: number): Promise<Article | null> {
  const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    tags: row.tags || [],
    embedding: row.embedding || null,
  } as Article;
}

export async function listArticles(pool: Pool, params: ArticleListParams = {}): Promise<PaginatedResult<Article>> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (params.category) {
    conditions.push(`category = $${paramIndex++}`);
    queryParams.push(params.category);
  }

  if (params.status) {
    conditions.push(`status = $${paramIndex++}`);
    queryParams.push(params.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM articles ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM articles ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  return {
    data: dataResult.rows.map((row: Record<string, unknown>) => ({
      ...row,
      tags: (row.tags as string[]) || [],
      embedding: row.embedding || null,
    })) as unknown as Article[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateArticle(pool: Pool, id: number, input: UpdateArticleInput): Promise<Article | null> {
  const existing = await getArticleById(pool, id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(input.title);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    params.push(input.content);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(input.category);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    params.push(input.tags);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(input.status);
  }

  if (updates.length === 0) return existing;

  updates.push(`updated_at = NOW()`);
  params.push(id);

  await pool.query(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  return getArticleById(pool, id);
}

export async function deleteArticle(pool: Pool, id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM articles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getCategories(pool: Pool): Promise<string[]> {
  const result = await pool.query('SELECT DISTINCT category FROM articles ORDER BY category');
  return result.rows.map((row: { category: string }) => row.category);
}
