import { Router } from 'express';

import adminAuthRoutes from '../features/admin/routes/admin-auth.routes';

const router = Router();

router.use('/admin', adminAuthRoutes);

export default router;
