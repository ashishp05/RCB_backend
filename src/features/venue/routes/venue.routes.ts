import { Router } from 'express';

import { container } from '../../../container';
import { validateQuery } from '../../../middleware/validation.middleware';
import { slotsQuerySchema } from '../schemas/venue.schema';

const { venueController } = container;

const router = Router();

router.get('/', venueController.listVenues);
router.get('/:id', venueController.getVenue);
router.get('/:id/slots', validateQuery(slotsQuerySchema), venueController.getSlots);
router.get('/:id/offers', venueController.listOffers);

export default router;
