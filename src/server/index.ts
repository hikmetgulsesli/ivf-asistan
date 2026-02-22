import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { config } from '../config/index.js';
import { errorHandler } from '../middleware/error-handler.js';
import { createAdminAuthRouter } from '../routes/admin/auth.js';
import { createAdminRouter } from '../routes/admin/index.js';
import { createChatRouter } from '../routes/chat.js';
import { createCategoriesRouter } from '../routes/categories.js';
import { createSuggestionsRouter } from '../routes/suggestions.js';
import { createFeedbackRouter } from '../routes/feedback.js';
import { createVideosRouter } from '../routes/admin/videos.js';

dotenv.config();

const app = express();
const PORT = config.port;

const pool = new Pool({
  connectionString: config.databaseUrl,
});

app.use(cors({
  origin: config.corsOrigins,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/admin', createAdminAuthRouter(pool));
app.use('/api/admin', createAdminRouter(pool));
app.use('/api/admin/videos', createVideosRouter(pool));

app.use('/api', createChatRouter(pool));
app.use('/api', createCategoriesRouter(pool));
app.use('/api', createSuggestionsRouter(pool));
app.use('/api', createFeedbackRouter(pool));

// Serve client build (production only)
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    // Let API routes fall through to subsequent middleware (e.g., 404/error handlers)
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database connection...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database connection...');
  await pool.end();
  process.exit(0);
});

export default app;
export { pool };
