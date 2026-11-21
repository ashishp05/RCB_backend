import { Router } from 'express';

import { PrismaService } from '../../../config/prisma.config';
import { auth, checkUserRole } from '../../../middleware/auth.middleware';
import { authRateLimiter } from '../../../middleware/security.middleware';
import { validateRequest } from '../../../middleware/validation.middleware';
import { AdminAuthController } from '../controllers/admin-auth.controller';
import { AdminRepository } from '../repositories/admin.repository';
import {
  adminChangePasswordSchema,
  adminLoginSchema,
  adminRegisterSchema,
} from '../schemas/admin.schema';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminRoles } from '../types/admin.types';

const prisma = PrismaService.getInstance().client;
const adminRepository = new AdminRepository(prisma);
const adminAuthService = new AdminAuthService(adminRepository);
const adminAuthController = new AdminAuthController(adminAuthService);

const router = Router();

const adminGuard = [auth, checkUserRole([AdminRoles.SUPER_ADMIN, AdminRoles.ADMIN])];

router.post(
  '/register',
  authRateLimiter,
  validateRequest(adminRegisterSchema),
  adminAuthController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validateRequest(adminLoginSchema),
  adminAuthController.login,
);

router.get('/profile', ...adminGuard, adminAuthController.getProfile);

router.post(
  '/change-password',
  ...adminGuard,
  validateRequest(adminChangePasswordSchema),
  adminAuthController.changePassword,
);

router.post('/logout', ...adminGuard, adminAuthController.logout);

export default router;
