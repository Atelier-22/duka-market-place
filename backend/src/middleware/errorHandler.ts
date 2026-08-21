import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { InvalidTransitionError, UnauthorizedTransitionError } from '../utils/orderStateMachine';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * Postgres surfaces constraint breaches as driver errors, not ApiErrors. Without
 * this mapping a duplicate phone/email that slipped past the pre-check (a race,
 * or a row stored in a different letter case) becomes an opaque 500.
 */
function pgUniqueViolationMessage(err: unknown): string | null {
  const e = err as { code?: string; constraint?: string; detail?: string };
  if (e?.code !== '23505') return null;

  const target = `${e.constraint ?? ''} ${e.detail ?? ''}`;
  if (target.includes('email')) return 'An account with this email already exists — try logging in instead';
  if (target.includes('phone')) return 'An account with this phone number already exists — try logging in instead';
  return 'That record already exists';
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }

  const duplicate = pgUniqueViolationMessage(err);
  if (duplicate) {
    return res.status(409).json({ error: duplicate });
  }
  if (err instanceof InvalidTransitionError || err instanceof UnauthorizedTransitionError) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message });
  }

  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
