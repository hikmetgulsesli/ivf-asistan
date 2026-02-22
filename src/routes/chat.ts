import express from 'express';
import { Pool } from 'pg';
import { ChatService } from '../services/chat-service.js';
import { config } from '../config/index.js';
import { ValidationError } from '../utils/errors.js';

const router = express.Router();

export function createChatRouter(pool: Pool): express.Router {
  const chatService = new ChatService(
    pool,
    config.minimaxApiKey,
    config.minimaxApiHost,
    config.cacheTtlHours
  );

  const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  function checkRateLimit(sessionId: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000;

    const sessionData = rateLimitStore.get(sessionId);

    if (!sessionData || now > sessionData.resetTime) {
      rateLimitStore.set(sessionId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (sessionData.count >= config.rateLimitPerMinute) {
      return false;
    }

    sessionData.count++;
    return true;
  }

  router.post('/chat', async (req, res, next) => {
    try {
      const { message, session_id, stage } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new ValidationError('message', 'Message is required and must be a non-empty string');
      }

      if (!session_id || typeof session_id !== 'string' || session_id.trim().length === 0) {
        throw new ValidationError('session_id', 'session_id is required and must be a non-empty string');
      }

      if (message.length > 2000) {
        throw new ValidationError('message', 'Message must be less than 2000 characters');
      }

      if (!checkRateLimit(session_id)) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Maximum ${config.rateLimitPerMinute} requests per minute.`,
          },
        });
      }

      const response = await chatService.chat(message, session_id, stage);

      res.json({
        data: {
          answer: response.answer,
          sources: response.sources,
          sentiment: response.sentiment,
          isEmergency: response.isEmergency,
          emergencyMessage: response.emergencyMessage,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/chat/history', async (req, res, next) => {
    try {
      const { session_id, limit } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        throw new ValidationError('session_id', 'session_id is required');
      }

      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      if (limitNum < 1 || limitNum > 100) {
        throw new ValidationError('limit', 'Limit must be between 1 and 100');
      }

      const history = await chatService.getConversationHistory(session_id, limitNum);

      res.json({
        data: history,
        meta: {
          session_id,
          limit: limitNum,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/chat/session', async (req, res, next) => {
    try {
      const { session_id } = req.body;

      if (!session_id || typeof session_id !== 'string') {
        throw new ValidationError('session_id', 'session_id is required');
      }

      const deletedCount = await chatService.clearSession(session_id);

      res.json({
        data: {
          deleted: deletedCount,
          session_id,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
