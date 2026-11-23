import { Router } from 'express';

import { container } from '../../../container';
import { otpRateLimiter } from '../../../middleware/security.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import {
  sendOtpSchema,
  simpleLoginSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from '../schemas/visitor.schema';

const { visitorController, visitorGuard } = container;

const router = Router();

// Customer login by name + mobile (CUSTOMER_LOGIN_MODE=simple)
router.post(
  '/login',
  otpRateLimiter,
  validateRequest(simpleLoginSchema),
  visitorController.simpleLogin,
);

// Customer login by SMS code (rate limited per IP; per-number limits live in the service).
router.post('/otp/send', otpRateLimiter, validateRequest(sendOtpSchema), visitorController.sendOtp);
router.post(
  '/otp/verify',
  otpRateLimiter,
  validateRequest(verifyOtpSchema),
  visitorController.verifyOtp,
);

// Signed in
router.get('/me', visitorGuard, visitorController.me);
router.patch('/me', visitorGuard, validateRequest(updateProfileSchema), visitorController.updateMe);

export default router;
