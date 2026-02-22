import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { config } from '../../config/index.js';
import { UnauthorizedError, ValidationError } from '../../utils/errors.js';

const router = express.Router();

const admins = new Map<string, { id: string; username: string; passwordHash: string }>();

const defaultAdminPassword = bcrypt.hashSync('ivf2024', 10);
admins.set('admin', { id: '1', username: 'admin', passwordHash: defaultAdminPassword });

export function createAdminAuthRouter(_pool: Pool): express.Router {
  router.post('/auth/login', async (req, res, next) => {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string') {
        throw new ValidationError('username', 'Username is required');
      }

      if (!password || typeof password !== 'string') {
        throw new ValidationError('password', 'Password is required');
      }

      const admin = admins.get(username);

      if (!admin) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const isValidPassword = bcrypt.compareSync(password, admin.passwordHash);

      if (!isValidPassword) {
        throw new UnauthorizedError('Invalid username or password');
      }

      const token = jwt.sign({ id: admin.id, username: admin.username }, config.jwtSecret, { expiresIn: '24h' });

      res.json({
        data: {
          token,
          user: {
            id: admin.id,
            username: admin.username,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
