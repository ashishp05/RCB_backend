import { Router } from 'express';

import { container } from '../../../container';
import { validateRequest } from '../../../middleware/validation.middleware';
import { createHoldSchema } from '../schemas/booking.schema';

const { bookingController } = container;

const router = Router();

router.post('/', validateRequest(createHoldSchema), bookingController.createHold);
router.delete('/:id', bookingController.releaseHold);

export default router;
