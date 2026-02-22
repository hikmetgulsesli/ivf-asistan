import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AdminUser {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

const adminUsers: Map<string, AdminUser> = new Map();

const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'ivf2024',
};

export async function initializeAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const admin: AdminUser = {
    id: 1,
    username: DEFAULT_ADMIN.username,
    passwordHash,
    createdAt: new Date(),
  };
  adminUsers.set(admin.username, admin);
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { username, password } = credentials;

  const admin = adminUsers.get(username);
  if (!admin) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  const jwtSecret = config.jwtSecret;
  const token = jwt.sign(
    { adminId: admin.id, username: admin.username },
    jwtSecret,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: admin.id,
      username: admin.username,
    },
  };
}

export interface JwtPayload {
  adminId: number;
  username: string;
  iat?: number;
  exp?: number;
}

export function verifyToken(token: string): JwtPayload {
  const jwtSecret = config.jwtSecret;
  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
    return decoded;
  } catch {
    throw new Error('Invalid token');
  }
}
