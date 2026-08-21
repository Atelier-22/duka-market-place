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
  // Uniqueness is scoped per role, so these only fire for a same-role duplicate.
  if (target.includes('email')) return 'You already have an account of this type on this email — try logging in instead';
  if (target.includes('phone')) return 'You already have an account of this type on this phone number — try logging in instead';
  return 'That record already exists';
}

/**
 * Turn a Zod failure into something a person can act on.
 *
 * "Validation failed" is what every one of these used to say, on a toast with
 * no detail — the user could see that something was wrong and had no way to
 * find out what. The `details` payload always carried the real reason; it was
 * simply never shown. This lifts the first concrete problem into the message.
 */
function zodMessage(err: ZodError): string {
  const flat = err.flatten();
  // A .refine() on the whole object (e.g. "must have text or an attachment")
  // lands in formErrors and is usually the most useful thing to say.
  if (flat.formErrors.length > 0) return flat.formErrors[0];

  const [field, messages] = Object.entries(flat.fieldErrors)[0] ?? [];
  if (field && messages?.length) {
    const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
    return `${label}: ${messages[0]}`;
  }
  return 'Validation failed';
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: zodMessage(err), details: err.flatten() });
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
