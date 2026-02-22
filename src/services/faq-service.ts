import { Pool } from 'pg';

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  embedding: number[] | null;
  created_at: string;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  category: string;
  sort_order?: number;
}

export interface UpdateFaqInput {
  question?: string;
  answer?: string;
  category?: string;
  sort_order?: number;
}

export interface FaqListParams {
  page?: number;
  limit?: number;
  category?: string;
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

export async function createFaq(pool: Pool, input: CreateFaqInput): Promise<FAQ> {
  const sort_order = input.sort_order || 0;

  const result = await pool.query(
    `INSERT INTO faqs (question, answer, category, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.question, input.answer, input.category, sort_order]
  );

  const row = result.rows[0];
  return {
    ...row,
    embedding: row.embedding || null,
  } as FAQ;
}

export async function getFaqById(pool: Pool, id: number): Promise<FAQ | null> {
  const result = await pool.query('SELECT * FROM faqs WHERE id = $1', [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    ...row,
    embedding: row.embedding || null,
  } as FAQ;
}

export async function listFaqs(pool: Pool, params: FaqListParams = {}): Promise<PaginatedResult<FAQ>> {
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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) as count FROM faqs ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT * FROM faqs ${whereClause}
     ORDER BY sort_order ASC, created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...queryParams, limit, offset]
  );

  return {
    data: dataResult.rows.map((row: Record<string, unknown>) => ({
      ...row,
      embedding: row.embedding || null,
    })) as unknown as FAQ[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateFaq(pool: Pool, id: number, input: UpdateFaqInput): Promise<FAQ | null> {
  const existing = await getFaqById(pool, id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.question !== undefined) {
    updates.push(`question = $${paramIndex++}`);
    params.push(input.question);
  }
  if (input.answer !== undefined) {
    updates.push(`answer = $${paramIndex++}`);
    params.push(input.answer);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    params.push(input.category);
  }
  if (input.sort_order !== undefined) {
    updates.push(`sort_order = $${paramIndex++}`);
    params.push(input.sort_order);
  }

  if (updates.length === 0) return existing;

  params.push(id);

  await pool.query(
    `UPDATE faqs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  return getFaqById(pool, id);
}

export async function deleteFaq(pool: Pool, id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM faqs WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
