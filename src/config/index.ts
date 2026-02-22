import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-not-for-production',
  minimaxApiKey: process.env.MINIMAX_API_KEY || '',
  minimaxApiHost: process.env.MINIMAX_API_HOST || 'https://api.minimax.io',
  kimiApiKey: process.env.KIMI_API_KEY || '',
  kimiApiUrl: process.env.KIMI_API_URL || 'https://api.kimi.com/coding/v1',
  kimiModel: process.env.KIMI_MODEL || 'kimi-for-coding',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  cacheTtlHours: parseInt(process.env.CACHE_TTL_HOURS || '24', 10),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '10', 10),
  sessionCleanupHours: parseInt(process.env.SESSION_CLEANUP_HOURS || '24', 10),
};

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
