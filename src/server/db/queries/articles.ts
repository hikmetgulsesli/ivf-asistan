import { getPool } from '../connection.js';
import type { Article, ArticleCreateInput, ArticleUpdateInput, PaginatedResult, ListQueryParams } from '../types.js';

export async function listArticles(params: ListQueryParams): Promise<PaginatedResult<Article>> {
  const pool = getPool();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const queryParams: (string | number)[] = [];
  let paramIndex = 1;

  if (params.category) {
    whereClause += ` AND category = $${paramIndex}`;
    queryParams.push(params.category);
    paramIndex++;
  }

  if (params.status) {
    whereClause += ` AND status = $${paramIndex}`;
    queryParams.push(params.status);
    paramIndex++;
  }

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM articles ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated data
  const dataResult = await pool.query(
    `SELECT * FROM articles ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...queryParams, limit, offset]
  );

  return {
    data: dataResult.rows,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getArticleById(id: number): Promise<Article | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createArticle(input: ArticleCreateInput): Promise<Article> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO articles (title, content, category, tags, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.title, input.content, input.category, input.tags || null, input.status || 'draft']
  );
  return result.rows[0];
}

export async function updateArticle(id: number, input: ArticleUpdateInput): Promise<Article | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(input.content);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    values.push(input.tags);
  }
  if (input.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(input.status);
  }

  if (updates.length === 0) {
    return getArticleById(id);
  }

  updates.push(`updated_at = NOW()`);
  
  const result = await pool.query(
    `UPDATE articles SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] || null;
}

export async function deleteArticle(id: number): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query('DELETE FROM articles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
