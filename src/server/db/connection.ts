import pg from 'pg';

const { Pool } = pg;

export interface DatabaseConfig {
  connectionString: string;
  max?: number;
}

let pool: pg.Pool | null = null;

export function initDatabase(config?: DatabaseConfig): pg.Pool {
  if (pool) {
    return pool;
  }

  const connectionString = config?.connectionString || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  pool = new Pool({
    connectionString,
    max: config?.max || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    return initDatabase();
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
