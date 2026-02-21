import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/ivf_asistan',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(','),
};
