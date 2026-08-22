import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(
  userId: string,
  role: JwtPayload['role'],
  linked: string[] = [],
  kind: 'user' | 'staff' = 'user'
): string {
  const payload: JwtPayload = { sub: userId, role, linked, kind };
  const options: SignOptions = { expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtAccessSecret, options);
}

export function signRefreshToken(
  userId: string,
  role: JwtPayload['role'],
  linked: string[] = [],
  kind: 'user' | 'staff' = 'user'
): string {
  const payload: JwtPayload = { sub: userId, role, linked, kind };
  const options: SignOptions = { expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwtRefreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtAccessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as JwtPayload;
}
