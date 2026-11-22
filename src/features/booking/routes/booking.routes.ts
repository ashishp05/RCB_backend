import { Router } from 'express';

import { container } from '../../../container';
import { validateRequest } from '../../../middleware/validation.middleware';
import {
  cancelBookingSchema,
  createBookingSchema,
  pricePreviewSchema,
  rescheduleBookingSchema,
} from '../schemas/booking.schema';

const { bookingController, visitorGuard } = container;

const router = Router();

// Public
router.post('/price', validateRequest(pricePreviewSchema), bookingController.previewPrice);

// Signed-in customer (OTP login)
router.get('/', visitorGuard, bookingController.listMine);
router.post('/', visitorGuard, validateRequest(createBookingSchema), bookingController.create);
router.get('/:id', visitorGuard, bookingController.getById);
router.post(
  '/:id/cancel',
  visitorGuard,
  validateRequest(cancelBookingSchema),
  bookingController.cancel,
);
router.post(
  '/:id/reschedule',
  visitorGuard,
  validateRequest(rescheduleBookingSchema),
  bookingController.reschedule,
);

export default router;
