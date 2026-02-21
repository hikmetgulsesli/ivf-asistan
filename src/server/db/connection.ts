import { Pool } from 'pg';

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
};

// Create a connection pool for direct SQL queries
export const pool = globalForPool.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Helper function for direct SQL queries
export function getPool(): Pool {
  return pool;
}

export { Pool };

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pool = pool;
}

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch {
    return false;
  }
}

export default pool;
