import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  adminId: number;
  username: string;
  iat?: number;
  exp?: number;
}

interface AdminUser {
  id: number;
  username: string;
  passwordHash: string;
}

// In-memory admin store (singleton)
let adminUser: AdminUser | null = null;

export async function initializeAdmin(): Promise<void> {
  // Create default admin if not exists
  if (!adminUser) {
    const defaultUsername = 'admin';
    const defaultPassword = process.env.ADMIN_PASSWORD || 'ivf2024';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    adminUser = {
      id: 1,
      username: defaultUsername,
      passwordHash,
    };
  }
}

export async function login(credentials: { username: string; password: string }): Promise<{ token: string; admin: { id: number; username: string } }> {
  await initializeAdmin();

  if (!adminUser) {
    throw new Error('Admin not initialized');
  }

  if (credentials.username !== adminUser.username) {
    throw new Error('Invalid credentials');
  }

  const isValid = await bcrypt.compare(credentials.password, adminUser.passwordHash);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  const payload: JwtPayload = {
    adminId: adminUser.id,
    username: adminUser.username,
  };

  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

  return {
    token,
    admin: {
      id: adminUser.id,
      username: adminUser.username,
    },
  };
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch {
    throw new Error('Invalid or expired token');
  }
}
