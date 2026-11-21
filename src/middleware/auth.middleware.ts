import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt, { Secret } from 'jsonwebtoken';

import { env } from '../config/env-config';
import { ApiError } from '../utils/api-error.util';

// Environment variable for JWT secret
const secret: Secret = env.JWT_SECRET as string;

// AuthPayload interface
interface AuthPayload {
  userId: string;
  role: string;
}

// Augment the Express Request object to include custom properties
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      role?: string;
    }
  }
}

/**
 * Authentication Service Class
 * Contains methods for authentication and role-based access control.
 */
class AuthService {
  private secret: Secret;

  constructor(secret: Secret) {
    this.secret = secret;
  }

  /**
   * Authenticate and validate the JWT token
   */
  public auth(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
    }

    try {
      const decodedToken = jwt.verify(token, this.secret) as AuthPayload;
      req.userId = decodedToken.userId;
      req.role = decodedToken.role;

      next();
    } catch {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
    }
  }

  /**
   * Check if the user has the required role(s)
   */
  public checkUserRole(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'No token provided');
      }

      try {
        const decodedToken = jwt.verify(token, this.secret) as AuthPayload;

        if (allowedRoles.includes(decodedToken.role)) {
          req.userId = decodedToken.userId;
          req.role = decodedToken.role;

          next();
          return;
        }

        throw new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: Insufficient permissions');
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
      }
    };
  }
}

// Instantiate AuthService
const authService = new AuthService(secret);

// Export methods for use in routes
export const auth = authService.auth.bind(authService);
export const checkUserRole = authService.checkUserRole.bind(authService);
