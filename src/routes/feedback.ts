import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

export function createFeedbackRouter(_pool: Pool): express.Router {
  router.post('/feedback', async (req, res) => {
    try {
      const { session_id, message, was_helpful } = req.body;

      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'session_id is required',
          },
        });
      }

      if (was_helpful === undefined || typeof was_helpful !== 'boolean') {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'was_helpful is required and must be a boolean',
          },
        });
      }

      console.log(`Feedback received - Session: ${session_id}, Helpful: ${was_helpful}, Message: ${message?.slice(0, 100) || 'N/A'}`);

      res.json({
        data: {
          acknowledged: true,
          session_id,
          was_helpful,
        },
      });
    } catch (error) {
      console.error('Error processing feedback:', error);
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process feedback',
        },
      });
    }
  });

  return router;
}
