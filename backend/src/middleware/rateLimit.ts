import { NextFunction, Request, Response } from 'express';

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimitOptions {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
  message?: string;
}

const buckets = new Map<string, Bucket>();
let sweepAt = Date.now() + 60_000;

function sweep(now: number) {
  if (now < sweepAt) return;
  sweepAt = now + 60_000;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function rateLimit(name: string, options: LimitOptions) {
  const message = options.message ?? 'Too many requests. Please wait a moment and try again.';
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    sweep(now);

    const identity = options.key ? options.key(req) : clientIp(req);
    const key = `${name}:${identity}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, options.max - bucket.count);
    res.setHeader('RateLimit-Limit', String(options.max));
    res.setHeader('RateLimit-Remaining', String(remaining));
    res.setHeader('RateLimit-Reset', String(Math.ceil((bucket.resetAt - now) / 1000)));

    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

function identifierFromBody(req: Request): string {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const raw = body.identifier ?? body.phone ?? body.email ?? '';
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export const limits = {
  api: rateLimit('api', { windowMs: MINUTE, max: 600 }),

  login: rateLimit('login', {
    windowMs: 15 * MINUTE,
    max: 100,
    message: 'Too many sign-in attempts. Wait fifteen minutes and try again.',
  }),
  loginByIdentity: rateLimit('login-id', {
    windowMs: 15 * MINUTE,
    max: 10,
    key: (req) => `${clientIp(req)}|${identifierFromBody(req)}`,
    message: 'Too many sign-in attempts for this account. Wait fifteen minutes and try again.',
  }),
  register: rateLimit('register', {
    windowMs: HOUR,
    max: 40,
    message: 'Too many accounts created from this connection. Try again later.',
  }),
  refresh: rateLimit('refresh', { windowMs: MINUTE, max: 60 }),
  password: rateLimit('password', {
    windowMs: 15 * MINUTE,
    max: 10,
    message: 'Too many password attempts. Wait fifteen minutes and try again.',
  }),

  upload: rateLimit('upload', {
    windowMs: 10 * MINUTE,
    max: 60,
    key: (req) => req.user?.id ?? clientIp(req),
    message: 'You are uploading too quickly. Give it a minute.',
  }),
  verification: rateLimit('verification', {
    windowMs: HOUR,
    max: 5,
    key: (req) => req.user?.id ?? clientIp(req),
    message: 'Too many verification submissions. Try again in an hour.',
  }),

  write: rateLimit('write', {
    windowMs: MINUTE,
    max: 60,
    key: (req) => req.user?.id ?? clientIp(req),
  }),
  message: rateLimit('message', {
    windowMs: MINUTE,
    max: 40,
    key: (req) => req.user?.id ?? clientIp(req),
    message: 'You are sending messages too quickly.',
  }),
  location: rateLimit('location', {
    windowMs: MINUTE,
    max: 120,
    key: (req) => req.user?.id ?? clientIp(req),
  }),
};
