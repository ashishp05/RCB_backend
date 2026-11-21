import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendData, sendList } from '../../../utils/response.util';
import { BookingService } from '../../booking/services/booking.service';
import {
  AdminBookingsQuery,
  AdminCancelBookingInput,
  AdminCreateBookingInput,
  AdminRescheduleBookingInput,
  MarkPaidInput,
} from '../../booking/types/booking.types';
import { NotificationService } from '../../notification/services/notification.service';
import { SmsQuery } from '../../notification/types/sms.types';
import { CreateOrderInput } from '../../payment/types/payment.types';
import { VenueService } from '../../venue/services/venue.service';
import {
  CreateOfferInput,
  UpdateOfferInput,
  UpdateSettingsInput,
} from '../../venue/types/venue.types';
import { VisitorService } from '../../visitor/services/visitor.service';
import { CustomersQuery } from '../../visitor/types/visitor.types';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { DashboardQuery, StaffLoginInput } from '../types/admin.types';

type IdParams = { id: string };

const staffIdOf = (req: Request): string => {
  if (!req.userId) throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.UNAUTHORIZED);
  return req.userId;
};

export class AdminController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly dashboardService: AdminDashboardService,
    private readonly venueService: VenueService,
    private readonly bookingService: BookingService,
    private readonly visitorService: VisitorService,
    private readonly notificationService: NotificationService,
  ) {}

  // Auth

  login = async (req: Request<{}, {}, StaffLoginInput>, res: Response): Promise<void> => {
    sendData(res, await this.adminAuthService.login(req.body.pin));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    sendData(res, await this.adminAuthService.me(staffIdOf(req)));
  };

  // Dashboard

  dashboard = async (req: Request, res: Response): Promise<void> => {
    const { venueId, date } = req.query as unknown as DashboardQuery;
    sendData(res, await this.dashboardService.summary(venueId, date));
  };

  qrLink = async (req: Request, res: Response): Promise<void> => {
    sendData(res, this.dashboardService.qrLink());
  };

  // Venue settings & offers

  getSettings = async (req: Request<IdParams>, res: Response): Promise<void> => {
    sendData(res, await this.venueService.getSettings(req.params.id));
  };

  updateSettings = async (
    req: Request<IdParams, {}, UpdateSettingsInput>,
    res: Response,
  ): Promise<void> => {
    sendData(res, await this.venueService.updateSettings(req.params.id, req.body));
  };

  listOffers = async (req: Request<IdParams>, res: Response): Promise<void> => {
    sendData(res, await this.venueService.listAllOffers(req.params.id));
  };

  createOffer = async (
    req: Request<IdParams, {}, CreateOfferInput>,
    res: Response,
  ): Promise<void> => {
    sendData(
      res,
      await this.venueService.createOffer(req.params.id, req.body),
      StatusCodes.CREATED,
    );
  };

  updateOffer = async (
    req: Request<IdParams & { offerId: string }, {}, UpdateOfferInput>,
    res: Response,
  ): Promise<void> => {
    sendData(res, await this.venueService.updateOffer(req.params.id, req.params.offerId, req.body));
  };

  // Bookings

  createBooking = async (
    req: Request<{}, {}, AdminCreateBookingInput>,
    res: Response,
  ): Promise<void> => {
    const result = await this.bookingService.createAtCounter(staffIdOf(req), req.body);
    sendData(res, { ...result.booking, payment: result.payment }, StatusCodes.CREATED);
  };

  listBookings = async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AdminBookingsQuery;
    const { total, records } = await this.bookingService.listForAdmin(query);
    sendList(res, records, total);
  };

  getBooking = async (req: Request<IdParams>, res: Response): Promise<void> => {
    sendData(res, await this.bookingService.getForAdmin(req.params.id));
  };

  cancelBooking = async (
    req: Request<IdParams, {}, AdminCancelBookingInput>,
    res: Response,
  ): Promise<void> => {
    const { reason, refundAmount } = req.body;
    sendData(res, await this.bookingService.cancelByAdmin(req.params.id, reason, refundAmount));
  };

  rescheduleBooking = async (
    req: Request<IdParams, {}, AdminRescheduleBookingInput>,
    res: Response,
  ): Promise<void> => {
    const { date, startHour, pitchId } = req.body;
    sendData(
      res,
      await this.bookingService.rescheduleByAdmin(req.params.id, date, startHour, pitchId),
    );
  };

  markPaid = async (req: Request<IdParams, {}, MarkPaidInput>, res: Response): Promise<void> => {
    const { paymentKind, paymentMethodLabel } = req.body;
    sendData(
      res,
      await this.bookingService.markPaid(req.params.id, paymentKind, paymentMethodLabel),
    );
  };

  // New Razorpay order for a pending counter booking (e.g. switch from card to UPI).
  createPaymentOrder = async (
    req: Request<IdParams, {}, Pick<CreateOrderInput, 'method'>>,
    res: Response,
  ): Promise<void> => {
    sendData(res, await this.bookingService.createPaymentOrder(req.params.id, req.body.method));
  };

  // Customers & SMS

  listCustomers = async (req: Request, res: Response): Promise<void> => {
    const { total, records } = await this.visitorService.listCustomers(
      req.query as unknown as CustomersQuery,
    );
    sendList(res, records, total);
  };

  listSms = async (req: Request, res: Response): Promise<void> => {
    const { total, records } = await this.notificationService.list(
      req.query as unknown as SmsQuery,
    );
    sendList(res, records, total);
  };
}
