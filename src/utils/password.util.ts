import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { BCRYPT_SALT_ROUNDS } from '../constants/config.constants';

// Compared against when the email is unknown, so response time does not reveal accounts.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_SALT_ROUNDS);

export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

export const verifyPassword = (password: string, hash: string | null | undefined) =>
  bcrypt.compare(password, hash || DUMMY_HASH);

// Password-reset tokens: the raw token goes in the email, only its SHA-256 is stored.
export const generateResetToken = (): { token: string; tokenHash: string } => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: hashResetToken(token) };
};

export const hashResetToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');
