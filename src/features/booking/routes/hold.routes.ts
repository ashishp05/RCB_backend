import { Router } from 'express';

import { container } from '../../../container';
import { validateRequest } from '../../../middleware/validation.middleware';
import { createHoldSchema } from '../schemas/booking.schema';

const { bookingController, visitorGuard } = container;

const router = Router();

// Signed-in customer: one live hold per mobile number.
router.post('/', visitorGuard, validateRequest(createHoldSchema), bookingController.createHold);
router.delete('/:id', visitorGuard, bookingController.releaseHold);

export default router;
