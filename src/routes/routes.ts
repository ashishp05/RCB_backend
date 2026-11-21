import { Router } from 'express';

import adminRoutes from '../features/admin/routes/admin.routes';
import bookingRoutes from '../features/booking/routes/booking.routes';
import holdRoutes from '../features/booking/routes/hold.routes';
import paymentRoutes from '../features/payment/routes/payment.routes';
import venueRoutes from '../features/venue/routes/venue.routes';
import visitorRoutes from '../features/visitor/routes/visitor.routes';

const router = Router();

router.use('/visitors', visitorRoutes);
router.use('/venues', venueRoutes);
router.use('/holds', holdRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
