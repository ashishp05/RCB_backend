import { Router } from 'express';

import { container } from '../../../container';
import { validateQuery, validateRequest } from '../../../middleware/validation.middleware';
import { upsertVisitorSchema, visitorLookupQuerySchema } from '../schemas/visitor.schema';

const { visitorController } = container;

const router = Router();

router.post('/', validateRequest(upsertVisitorSchema), visitorController.upsert);
router.get('/me', validateQuery(visitorLookupQuerySchema), visitorController.me);

export default router;
