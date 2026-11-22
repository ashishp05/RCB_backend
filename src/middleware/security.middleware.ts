import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';

import { RATE_LIMIT } from '../constants/config.constants';
import { ValidationMessages } from '../constants/messages';

// General limiter applied to all routes.
const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT.GLOBAL_WINDOW_MS,
  max: RATE_LIMIT.GLOBAL_MAX,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { xForwardedForHeader: false },
});

// Tighter limiter for credential-stuffing/brute-force-prone auth routes (login/register).
const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
  max: RATE_LIMIT.AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: ValidationMessages.TOO_MANY_REQUESTS,
  },
});

// Customer OTP send/verify (its own counter, separate from staff login).
const otpRateLimiter = rateLimit({
  windowMs: RATE_LIMIT.OTP_WINDOW_MS,
  max: RATE_LIMIT.OTP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    message: ValidationMessages.TOO_MANY_REQUESTS,
  },
});

// Middleware to check host whitelist
// Rejects requests whose Origin header is not in the given whitelist.
const hostWhitelist = (allowedUrls: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { origin } = req.headers;

    if (!origin) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ success: false, message: ValidationMessages.ORIGIN_HEADER_IS_MISSING });
      return; // Exit to ensure no further middleware runs
    }

    if (allowedUrls.includes(origin as string)) {
      next(); // Host is whitelisted, continue processing the request
    } else {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ success: false, message: ValidationMessages.ACCESS_FORBIDDEN });
      return; // Exit to stop further processing
    }
  };
};

export { authRateLimiter, hostWhitelist, otpRateLimiter, rateLimiter };
