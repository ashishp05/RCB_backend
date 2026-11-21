import { PrismaService } from './config/prisma.config';
import { AdminController } from './features/admin/controllers/admin.controller';
import { AdminAuthController } from './features/admin/controllers/admin-auth.controller';
import { StaffController } from './features/admin/controllers/staff.controller';
import { createStaffGuard } from './features/admin/middleware/staff-guard.middleware';
import { StaffRepository } from './features/admin/repositories/staff.repository';
import { AdminAuthService } from './features/admin/services/admin-auth.service';
import { AdminDashboardService } from './features/admin/services/admin-dashboard.service';
import { StaffService } from './features/admin/services/staff.service';
import { BookingController } from './features/booking/controllers/booking.controller';
import { BookingRepository } from './features/booking/repositories/booking.repository';
import { BookingService } from './features/booking/services/booking.service';
import { SmsRepository } from './features/notification/repositories/sms.repository';
import { NotificationService } from './features/notification/services/notification.service';
import { PaymentController } from './features/payment/controllers/payment.controller';
import { PaymentRepository } from './features/payment/repositories/payment.repository';
import { PaymentService } from './features/payment/services/payment.service';
import { PaymentGatewayService } from './features/payment/services/payment-gateway.service';
import { VenueController } from './features/venue/controllers/venue.controller';
import { VenueRepository } from './features/venue/repositories/venue.repository';
import { VenueService } from './features/venue/services/venue.service';
import { VisitorController } from './features/visitor/controllers/visitor.controller';
import { VisitorRepository } from './features/visitor/repositories/visitor.repository';
import { VisitorService } from './features/visitor/services/visitor.service';
import { razorpayClient } from './utils/razorpay.util';
import { createSmsProvider } from './utils/sms.util';

// Single place where repositories, services and controllers are wired together.
const prisma = PrismaService.getInstance().client;

const venueRepository = new VenueRepository(prisma);
const visitorRepository = new VisitorRepository(prisma);
const bookingRepository = new BookingRepository(prisma);
const paymentRepository = new PaymentRepository(prisma);
const smsRepository = new SmsRepository(prisma);
const staffRepository = new StaffRepository(prisma);

const venueService = new VenueService(venueRepository);
const visitorService = new VisitorService(visitorRepository);
const notificationService = new NotificationService(smsRepository, createSmsProvider());
const paymentGateway = new PaymentGatewayService(paymentRepository, razorpayClient);
const bookingService = new BookingService(
  bookingRepository,
  venueService,
  visitorRepository,
  paymentGateway,
  notificationService,
);
const paymentService = new PaymentService(paymentRepository, bookingService, razorpayClient);
const adminAuthService = new AdminAuthService(staffRepository);
const staffService = new StaffService(staffRepository);
const adminDashboardService = new AdminDashboardService(
  bookingRepository,
  bookingService,
  venueService,
);

export const container = {
  bookingRepository,
  venueController: new VenueController(venueService),
  visitorController: new VisitorController(visitorService),
  bookingController: new BookingController(bookingService),
  paymentController: new PaymentController(paymentService),
  staffGuard: createStaffGuard(staffRepository),
  adminAuthController: new AdminAuthController(adminAuthService),
  staffController: new StaffController(staffService),
  adminController: new AdminController(
    adminDashboardService,
    venueService,
    bookingService,
    visitorService,
    notificationService,
  ),
};
