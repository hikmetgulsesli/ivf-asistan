import { getPool } from '../connection.js';
import type { Video, VideoCreateInput, VideoUpdateInput, PaginatedResult, ListQueryParams } from '../types.js';

export async function listVideos(params: ListQueryParams): Promise<PaginatedResult<Video>> {
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
    whereClause += ` AND analysis_status = $${paramIndex}`;
    queryParams.push(params.status);
    paramIndex++;
  }

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM videos ${whereClause}`,
    queryParams
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get paginated data
  const dataResult = await pool.query(
    `SELECT * FROM videos ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
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

export async function getVideoById(id: number): Promise<Video | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM videos WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createVideo(input: VideoCreateInput): Promise<Video> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO videos (title, url, category, duration_seconds, analysis_status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [input.title, input.url, input.category, input.duration_seconds || null]
  );
  return result.rows[0];
}

export async function updateVideo(id: number, input: VideoUpdateInput): Promise<Video | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = [];
  let paramIndex = 1;

  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.url !== undefined) {
    updates.push(`url = $${paramIndex++}`);
    values.push(input.url);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.duration_seconds !== undefined) {
    updates.push(`duration_seconds = $${paramIndex++}`);
    values.push(input.duration_seconds);
  }
  if (input.summary !== undefined) {
    updates.push(`summary = $${paramIndex++}`);
    values.push(input.summary);
  }
  if (input.key_topics !== undefined) {
    updates.push(`key_topics = $${paramIndex++}`);
    values.push(input.key_topics);
  }
  if (input.timestamps !== undefined) {
    updates.push(`timestamps = $${paramIndex++}`);
    values.push(input.timestamps);
  }
  if (input.analysis_status !== undefined) {
    updates.push(`analysis_status = $${paramIndex++}`);
    values.push(input.analysis_status);
  }

  if (updates.length === 0) {
    return getVideoById(id);
  }
  
  const result = await pool.query(
    `UPDATE videos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    [...values, id]
  );
  return result.rows[0] || null;
}

export async function deleteVideo(id: number): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query('DELETE FROM videos WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function getVideoAnalysisStatus(id: number): Promise<{ id: number; analysis_status: string } | null> {
  const pool = getPool();
  const result = await pool.query('SELECT id, analysis_status FROM videos WHERE id = $1', [id]);
  return result.rows[0] || null;
}
