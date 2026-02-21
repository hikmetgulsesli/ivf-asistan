import { getPool } from '../connection.js';
import type { FAQ, FAQCreateInput, FAQUpdateInput, PaginatedResult, ListQueryParams } from '../types.js';

export async function listFAQs(params: ListQueryParams): Promise<PaginatedResult<FAQ>> {
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

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM faqs ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated data ordered by sort_order
  const dataResult = await pool.query(
    `SELECT * FROM faqs ${whereClause} ORDER BY sort_order ASC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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

export async function getFAQById(id: number): Promise<FAQ | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM faqs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createFAQ(input: FAQCreateInput): Promise<FAQ> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO faqs (question, answer, category, sort_order)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.question, input.answer, input.category, input.sort_order || 0]
  );
  return result.rows[0];
}

export async function updateFAQ(id: number, input: FAQUpdateInput): Promise<FAQ | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  let paramIndex = 1;

  if (input.question !== undefined) {
    updates.push(`question = $${paramIndex++}`);
    values.push(input.question);
  }
  if (input.answer !== undefined) {
    updates.push(`answer = $${paramIndex++}`);
    values.push(input.answer);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.sort_order !== undefined) {
    updates.push(`sort_order = $${paramIndex++}`);
    values.push(input.sort_order);
  }

  if (updates.length === 0) {
    return getFAQById(id);
  }
  
  const result = await pool.query(
    `UPDATE faqs SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] || null;
}

export async function deleteFAQ(id: number): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query('DELETE FROM faqs WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
