import { Router } from 'express';

import { StaffRoles } from '../../../constants/config.constants';
import { container } from '../../../container';
import { validateQuery, validateRequest } from '../../../middleware/validation.middleware';
import {
  adminBookingsQuerySchema,
  adminCancelBookingSchema,
  adminCreateBookingSchema,
  adminRescheduleBookingSchema,
  markPaidSchema,
  paymentFailedSchema,
} from '../../booking/schemas/booking.schema';
import { smsQuerySchema } from '../../notification/schemas/sms.schema';
import { paymentOrderMethodSchema } from '../../payment/schemas/payment.schema';
import {
  createOfferSchema,
  updateOfferSchema,
  updateSettingsSchema,
} from '../../venue/schemas/venue.schema';
import { customersQuerySchema } from '../../visitor/schemas/visitor.schema';
import { dashboardQuerySchema } from '../schemas/admin.schema';
import adminAuthRoutes from './admin-auth.routes';
import adminStaffRoutes from './admin-staff.routes';

const { adminController, staffGuard } = container;

// admin: everything. staff: counter desk (bookings, customers, SMS log, QR).
const anyStaff = staffGuard([StaffRoles.ADMIN, StaffRoles.STAFF]);
const adminOnly = staffGuard([StaffRoles.ADMIN]);

const router = Router();

router.use('/auth', adminAuthRoutes);
router.use('/staff', adminStaffRoutes);

// Desk home & counter QR
router.get(
  '/dashboard',
  ...anyStaff,
  validateQuery(dashboardQuerySchema),
  adminController.dashboard,
);
router.get('/qr-link', ...anyStaff, adminController.qrLink);

// Rates & charges, offers
router.get('/venues/:id/settings', ...anyStaff, adminController.getSettings);
router.patch(
  '/venues/:id/settings',
  ...adminOnly,
  validateRequest(updateSettingsSchema),
  adminController.updateSettings,
);
router.get('/venues/:id/offers', ...anyStaff, adminController.listOffers);
router.post(
  '/venues/:id/offers',
  ...adminOnly,
  validateRequest(createOfferSchema),
  adminController.createOffer,
);
router.patch(
  '/venues/:id/offers/:offerId',
  ...adminOnly,
  validateRequest(updateOfferSchema),
  adminController.updateOffer,
);

// All bookings & walk-in
router.get(
  '/bookings',
  ...anyStaff,
  validateQuery(adminBookingsQuerySchema),
  adminController.listBookings,
);
router.post(
  '/bookings',
  ...anyStaff,
  validateRequest(adminCreateBookingSchema),
  adminController.createBooking,
);
router.get('/bookings/:id', ...anyStaff, adminController.getBooking);
router.post(
  '/bookings/:id/mark-paid',
  ...anyStaff,
  validateRequest(markPaidSchema),
  adminController.markPaid,
);
router.post(
  '/bookings/:id/payment-failed',
  ...anyStaff,
  validateRequest(paymentFailedSchema),
  adminController.paymentFailed,
);
router.post(
  '/bookings/:id/payment-order',
  ...anyStaff,
  validateRequest(paymentOrderMethodSchema),
  adminController.createPaymentOrder,
);
router.post(
  '/bookings/:id/cancel',
  ...anyStaff,
  validateRequest(adminCancelBookingSchema),
  adminController.cancelBooking,
);
router.post(
  '/bookings/:id/reschedule',
  ...anyStaff,
  validateRequest(adminRescheduleBookingSchema),
  adminController.rescheduleBooking,
);

// Customers & SMS log
router.get(
  '/customers',
  ...anyStaff,
  validateQuery(customersQuerySchema),
  adminController.listCustomers,
);
router.get('/customers/:phone', ...anyStaff, adminController.getCustomer);
router.get('/sms', ...anyStaff, validateQuery(smsQuerySchema), adminController.listSms);

export default router;
