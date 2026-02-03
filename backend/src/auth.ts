import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { users } from './db';
import { User, JWTPayload, PermissionLevel } from './types';

const SECRET = process.env.JWT_SECRET || 'change-me-very-secret';
const SUPERUSER_USERNAME = process.env.SUPERUSER_USERNAME || 'superadmin';
const SUPERUSER_PASSWORD = process.env.SUPERUSER_PASSWORD || 'superadmin123';

export function ensureSuperuser(): User {
  const data = users.get('users') || [];
  const existing = data.find((u) => u.isSuperuser);
  
  if (existing) {
    // Update superuser credentials from env if changed
    const newPwHash = bcrypt.hashSync(SUPERUSER_PASSWORD, 8);
    if (existing.username !== SUPERUSER_USERNAME) {
      existing.username = SUPERUSER_USERNAME;
      existing.password = newPwHash;
      users.set('users', data);
    }
    return existing;
  }
  
  // Create superuser
  const pw = bcrypt.hashSync(SUPERUSER_PASSWORD, 8);
  const superuser: User = {
    id: 'superuser',
    username: SUPERUSER_USERNAME,
    password: pw,
    role: 'superadmin',
    isSuperuser: true,
    permissions: { servers: 'edit', maps: 'edit', prompts: 'edit' },
  };
  data.unshift(superuser);
  users.set('users', data);
  return superuser;
}

// Deprecated - keep for backwards compatibility, now calls ensureSuperuser
export function ensureAdminUser(): User {
  return ensureSuperuser();
}

export function generateToken(user: User): string {
  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    isSuperuser: user.isSuperuser,
    permissions: user.permissions,
  };
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'Missing auth' });
    return;
  }
  const token = auth.replace(/^Bearer\s+/, '');
  try {
    req.user = jwt.verify(token, SECRET) as JWTPayload;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).end();
      return;
    }
    // Superadmin can do everything
    if (req.user.role === 'superadmin' || req.user.isSuperuser) {
      next();
      return;
    }
    // Admin can do most things
    if (req.user.role === 'admin' && !roles.includes('superadmin')) {
      next();
      return;
    }
    if (roles.includes(req.user.role)) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden' });
  };
}

export function requirePermission(resource: 'servers' | 'maps' | 'prompts', level: PermissionLevel) {
  const levels: PermissionLevel[] = ['none', 'view', 'run', 'edit'];
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).end();
      return;
    }
    // Superadmin and admin can do everything
    if (req.user.role === 'superadmin' || req.user.role === 'admin' || req.user.isSuperuser) {
      next();
      return;
    }
    const userLevel = req.user.permissions?.[resource] || 'none';
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(level);
    if (userLevelIndex >= requiredLevelIndex) {
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden' });
  };
}
