import jwt, { Secret } from 'jsonwebtoken';

import { env } from '../config/env-config';

const secret: Secret = env.JWT_SECRET;

export interface TokenPayload {
  userId: string;
  role: string;
  // Session version; lets the server revoke every token issued before a password change.
  tokenVersion?: number;
}

export const generateToken = (
  userId: string,
  role = 'user',
  tokenVersion?: number,
  expiresIn: string = env.JWT_EXPIRES_IN,
): string =>
  jwt.sign({ userId, role, ...(tokenVersion !== undefined && { tokenVersion }) }, secret, {
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });

// Throws when the token is malformed, tampered with or expired.
export const verifyToken = (token: string): TokenPayload =>
  jwt.verify(token, secret) as TokenPayload;

export const tokenExpiresInSeconds = (token: string): number | null => {
  const decoded = jwt.decode(token) as { exp?: number; iat?: number } | null;
  return decoded?.exp && decoded.iat ? decoded.exp - decoded.iat : null;
};
