import { Router } from 'express';

import { StaffRoles } from '../../../constants/config.constants';
import { container } from '../../../container';
import { auth, checkUserRole } from '../../../middleware/auth.middleware';
import { authRateLimiter } from '../../../middleware/security.middleware';
import { validateQuery, validateRequest } from '../../../middleware/validation.middleware';
import {
  adminBookingsQuerySchema,
  adminCancelBookingSchema,
  adminCreateBookingSchema,
  adminRescheduleBookingSchema,
  markPaidSchema,
} from '../../booking/schemas/booking.schema';
import { smsQuerySchema } from '../../notification/schemas/sms.schema';
import { paymentOrderMethodSchema } from '../../payment/schemas/payment.schema';
import {
  createOfferSchema,
  updateOfferSchema,
  updateSettingsSchema,
} from '../../venue/schemas/venue.schema';
import { customersQuerySchema } from '../../visitor/schemas/visitor.schema';
import { dashboardQuerySchema, staffLoginSchema } from '../schemas/admin.schema';

const { adminController } = container;

const router = Router();

router.post(
  '/auth/login',
  authRateLimiter,
  validateRequest(staffLoginSchema),
  adminController.login,
);

// Everything below requires a staff JWT.
router.use(auth, checkUserRole([StaffRoles.ADMIN, StaffRoles.STAFF]));

router.get('/me', adminController.me);
router.get('/dashboard', validateQuery(dashboardQuerySchema), adminController.dashboard);
router.get('/qr-link', adminController.qrLink);

router.get('/venues/:id/settings', adminController.getSettings);
router.patch(
  '/venues/:id/settings',
  validateRequest(updateSettingsSchema),
  adminController.updateSettings,
);
router.get('/venues/:id/offers', adminController.listOffers);
router.post('/venues/:id/offers', validateRequest(createOfferSchema), adminController.createOffer);
router.patch(
  '/venues/:id/offers/:offerId',
  validateRequest(updateOfferSchema),
  adminController.updateOffer,
);

router.get('/bookings', validateQuery(adminBookingsQuerySchema), adminController.listBookings);
router.post('/bookings', validateRequest(adminCreateBookingSchema), adminController.createBooking);
router.get('/bookings/:id', adminController.getBooking);
router.post(
  '/bookings/:id/cancel',
  validateRequest(adminCancelBookingSchema),
  adminController.cancelBooking,
);
router.post(
  '/bookings/:id/reschedule',
  validateRequest(adminRescheduleBookingSchema),
  adminController.rescheduleBooking,
);
router.post('/bookings/:id/mark-paid', validateRequest(markPaidSchema), adminController.markPaid);
router.post(
  '/bookings/:id/payment-order',
  validateRequest(paymentOrderMethodSchema),
  adminController.createPaymentOrder,
);

router.get('/customers', validateQuery(customersQuerySchema), adminController.listCustomers);
router.get('/sms', validateQuery(smsQuerySchema), adminController.listSms);

export default router;
