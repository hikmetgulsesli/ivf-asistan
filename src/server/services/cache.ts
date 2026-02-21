import { getPool } from '../db/connection.js';

export async function invalidateCache(): Promise<void> {
  const pool = getPool();
  try {
    // Delete all cache entries to force refresh
    await pool.query('DELETE FROM cache');
  } catch (error) {
    console.error('Cache invalidation error:', error);
    // Don't throw - cache invalidation failure shouldn't break the main operation
  }
}
