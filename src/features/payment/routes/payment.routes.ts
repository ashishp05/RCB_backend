import { Router } from 'express';

import { container } from '../../../container';
import { validateRequest } from '../../../middleware/validation.middleware';
import { createOrderSchema, verifyPaymentSchema } from '../schemas/payment.schema';

const { paymentController } = container;

const router = Router();

router.post('/razorpay/order', validateRequest(createOrderSchema), paymentController.createOrder);
router.post('/razorpay/verify', validateRequest(verifyPaymentSchema), paymentController.verify);
router.post('/razorpay/webhook', paymentController.webhook);

export default router;
