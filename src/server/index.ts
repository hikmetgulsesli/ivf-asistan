import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from '../config/index.js';
import { initializeAdmin } from '../services/auth-service.js';
import adminAuthRoutes from '../routes/admin/auth.js';
import adminRoutes from '../routes/admin/index.js';
import { errorHandler } from '../middleware/error-handler.js';

dotenv.config();

const app = express();

app.use(cors({
  origin: config.corsOrigins,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use(errorHandler);

async function start() {
  try {
    await initializeAdmin();
    console.log('Admin user initialized');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
