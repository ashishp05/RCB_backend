import { Router } from 'express';

import { StaffRoles } from '../../../constants/config.constants';
import { container } from '../../../container';
import { authRateLimiter } from '../../../middleware/security.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import {
  adminLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas/admin.schema';

const { adminAuthController, staffGuard } = container;
const anyStaff = staffGuard([StaffRoles.ADMIN, StaffRoles.STAFF]);

const router = Router();

// Public (rate limited)
router.post(
  '/login',
  authRateLimiter,
  validateRequest(adminLoginSchema),
  adminAuthController.login,
);
router.post(
  '/forgot-password',
  authRateLimiter,
  validateRequest(forgotPasswordSchema),
  adminAuthController.forgotPassword,
);
router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest(resetPasswordSchema),
  adminAuthController.resetPassword,
);

// Signed in
router.get('/me', ...anyStaff, adminAuthController.me);
router.post(
  '/change-password',
  ...anyStaff,
  validateRequest(changePasswordSchema),
  adminAuthController.changePassword,
);
router.post('/logout', ...anyStaff, adminAuthController.logout);
router.post('/logout-all', ...anyStaff, adminAuthController.logoutAll);

export default router;
