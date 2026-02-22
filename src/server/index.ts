import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from '../config/index.js';
import { errorHandler } from '../middleware/error-handler.js';
import { createAdminAuthRouter } from '../routes/admin/auth.js';
import { createAdminRouter } from '../routes/admin/index.js';
import { createChatRouter } from '../routes/chat.js';
import { createCategoriesRouter } from '../routes/categories.js';
import { createSuggestionsRouter } from '../routes/suggestions.js';
import { createFeedbackRouter } from '../routes/feedback.js';

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

app.use('/api', createChatRouter(pool));
app.use('/api', createCategoriesRouter(pool));
app.use('/api', createSuggestionsRouter(pool));
app.use('/api', createFeedbackRouter(pool));

// Serve frontend static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

// SPA fallback - serve index.html for non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(errorHandler);

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

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
