import { Router } from 'express';

import { StaffRoles } from '../../../constants/config.constants';
import { container } from '../../../container';
import { validateRequest } from '../../../middleware/validation.middleware';
import {
  adminSetPasswordSchema,
  createStaffSchema,
  updateStaffSchema,
} from '../schemas/admin.schema';

const { staffController, staffGuard } = container;

const router = Router();

// Staff account management is admin-only.
router.use(...staffGuard([StaffRoles.ADMIN]));

router.get('/', staffController.list);
router.post('/', validateRequest(createStaffSchema), staffController.create);
router.get('/:id', staffController.get);
router.patch('/:id', validateRequest(updateStaffSchema), staffController.update);
router.post('/:id/password', validateRequest(adminSetPasswordSchema), staffController.setPassword);

export default router;
