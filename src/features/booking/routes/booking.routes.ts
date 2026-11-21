import { Router } from 'express';

import { container } from '../../../container';
import { validateQuery, validateRequest } from '../../../middleware/validation.middleware';
import {
  cancelBookingSchema,
  createBookingSchema,
  customerBookingsQuerySchema,
  pricePreviewSchema,
  rescheduleBookingSchema,
} from '../schemas/booking.schema';

const { bookingController } = container;

const router = Router();

router.get('/', validateQuery(customerBookingsQuerySchema), bookingController.listMine);
router.post('/', validateRequest(createBookingSchema), bookingController.create);
router.post('/price', validateRequest(pricePreviewSchema), bookingController.previewPrice);
router.get('/:id', bookingController.getById);
router.post('/:id/cancel', validateRequest(cancelBookingSchema), bookingController.cancel);
router.post(
  '/:id/reschedule',
  validateRequest(rescheduleBookingSchema),
  bookingController.reschedule,
);

export default router;
