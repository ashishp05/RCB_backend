import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { CUSTOMER_AUTH } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { verifyToken } from '../../../utils/generate-token.util';
import { VisitorRepository } from '../repositories/visitor.repository';

// Customer-site guard: a visitor JWT from POST /visitors/otp/verify. Sets req.visitor.
export const createVisitorGuard =
  (visitorRepository: VisitorRepository): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.LOGIN_REQUIRED);
    }

    let visitorId: string;
    try {
      const payload = verifyToken(token);
      if (payload.role !== CUSTOMER_AUTH.TOKEN_ROLE) throw new Error('not a visitor token');
      visitorId = payload.userId;
    } catch {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.SESSION_EXPIRED);
    }

    const visitor = await visitorRepository.findById(visitorId);
    if (!visitor) throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.SESSION_EXPIRED);
    req.visitor = { id: visitor.id, name: visitor.name, phone: visitor.phone };
    next();
  };
