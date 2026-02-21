import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from '../config';
import { initializeAdmin } from '../services/auth-service';
import adminAuthRoutes from '../routes/admin/auth';
import adminRoutes from '../routes/admin/index';
import { errorHandler } from '../middleware/error-handler';
import cacheRouter from './routes/admin-cache.js';
import videosRouter from './routes/videos.js';

dotenv.config();

const app = express();
const PORT = config.port;

app.use(cors({
  origin: config.corsOrigins,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/videos', videosRouter);
app.use('/api/admin', cacheRouter);
app.use(errorHandler);

async function start() {
  try {
    await initializeAdmin();
    console.log('Admin user initialized');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
