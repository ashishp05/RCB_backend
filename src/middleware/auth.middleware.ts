import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ApiError } from '../utils/api-error.util';
import { verifyToken } from '../utils/generate-token.util';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
      tokenVersion?: number;
    }
  }
}

const bearerToken = (req: Request): string | undefined => {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
};

// Verifies the Bearer JWT and exposes its claims on the request.
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const token = bearerToken(req);
  if (!token) throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');

  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    req.role = payload.role;
    req.tokenVersion = payload.tokenVersion;
  } catch {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
  }
  next();
};

// Use after `auth`: rejects users whose role is not in the list.
export const checkUserRole =
  (allowedRoles: readonly string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: Insufficient permissions');
    }
    next();
  };
