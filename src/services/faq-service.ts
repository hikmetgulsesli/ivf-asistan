import { getDb } from '../db/connection.js';

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

export function createFaq(input: CreateFaqInput): FAQ {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO faqs (question, answer, category, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    input.question,
    input.answer,
    input.category,
    input.sort_order || 0
  );
  
  return getFaqById(result.lastInsertRowid as number)!;
}

export function getFaqById(id: number): FAQ | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM faqs WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  
  if (!row) return null;
  
  return {
    ...row,
    embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
  } as unknown as FAQ;
}

export function listFaqs(params: FaqListParams = {}): PaginatedResult<FAQ> {
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
  
  // Get total count
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM faqs ${whereClause}`);
  const countResult = countStmt.get(...queryParams) as { count: number };
  const total = countResult.count;
  
  // Get paginated data
  const dataStmt = db.prepare(`
    SELECT * FROM faqs ${whereClause}
    ORDER BY sort_order ASC, created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  const rows = dataStmt.all(...queryParams, limit, offset) as Record<string, unknown>[];
  
  return {
    data: rows.map(row => ({
      ...row,
      embedding: row.embedding ? JSON.parse(String(row.embedding)) : null,
    })) as unknown as FAQ[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function updateFaq(id: number, input: UpdateFaqInput): FAQ | null {
  const db = getDb();
  const existing = getFaqById(id);
  if (!existing) return null;
  
  const updates: string[] = [];
  const params: unknown[] = [];
  
  if (input.question !== undefined) {
    updates.push('question = ?');
    params.push(input.question);
  }
  if (input.answer !== undefined) {
    updates.push('answer = ?');
    params.push(input.answer);
  }
  if (input.category !== undefined) {
    updates.push('category = ?');
    params.push(input.category);
  }
  if (input.sort_order !== undefined) {
    updates.push('sort_order = ?');
    params.push(input.sort_order);
  }
  
  if (updates.length === 0) return existing;
  
  params.push(id);
  
  const stmt = db.prepare(`
    UPDATE faqs SET ${updates.join(', ')} WHERE id = ?
  `);
  
  stmt.run(...params);
  
  return getFaqById(id);
}

export function deleteFaq(id: number): boolean {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM faqs WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}
