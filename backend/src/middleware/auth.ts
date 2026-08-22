import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { touchPresence } from '../services/presence.service';
import { UserRole } from '../types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole | 'admin' | 'super_admin'; linked: string[]; kind: 'user' | 'staff' };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }
  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length));
    req.user = {
      id: payload.sub,
      role: payload.role,
      linked: payload.linked ?? [],
      kind: payload.kind ?? 'user',
    };
    // Every authenticated request is a sign of life. Throttled internally and
    // never awaited — this must not add latency to the route it fronts.
    touchPresence(payload.sub);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: (UserRole | 'admin' | 'super_admin')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    // A super admin holds every admin power by definition, so asking for
    // 'admin' must not lock out the layer above it.
    const held = req.user.role === 'super_admin' ? ['super_admin', 'admin'] : [req.user.role];
    if (!roles.some((r) => held.includes(r))) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

/**
 * The narrower gate. Creating staff, and seeing that staff exist at all, is
 * super-admin only — an admin should not be able to enumerate the layer above
 * them, let alone add to it.
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.kind !== 'staff' || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Requires a super admin' });
  }
  next();
}
