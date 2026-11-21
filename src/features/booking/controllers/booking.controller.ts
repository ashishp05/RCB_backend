import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { sendData } from '../../../utils/response.util';
import { BookingService } from '../services/booking.service';
import {
  CancelBookingInput,
  CreateBookingInput,
  CreateHoldInput,
  CustomerBookingsQuery,
  PricePreviewInput,
  RescheduleBookingInput,
} from '../types/booking.types';

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  createHold = async (req: Request<{}, {}, CreateHoldInput>, res: Response): Promise<void> => {
    sendData(res, await this.bookingService.createHold(req.body), StatusCodes.CREATED);
  };

  releaseHold = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    await this.bookingService.releaseHold(req.params.id);
    res.status(StatusCodes.NO_CONTENT).end();
  };

  previewPrice = async (req: Request<{}, {}, PricePreviewInput>, res: Response): Promise<void> => {
    sendData(res, await this.bookingService.previewPrice(req.body));
  };

  create = async (req: Request<{}, {}, CreateBookingInput>, res: Response): Promise<void> => {
    sendData(res, await this.bookingService.createFromHold(req.body), StatusCodes.CREATED);
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.query as unknown as CustomerBookingsQuery;
    sendData(res, await this.bookingService.listByPhone(phone));
  };

  getById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    sendData(res, await this.bookingService.getById(req.params.id));
  };

  cancel = async (
    req: Request<{ id: string }, {}, CancelBookingInput>,
    res: Response,
  ): Promise<void> => {
    const { phone, reason } = req.body;
    sendData(res, await this.bookingService.cancelByCustomer(req.params.id, phone, reason));
  };

  reschedule = async (
    req: Request<{ id: string }, {}, RescheduleBookingInput>,
    res: Response,
  ): Promise<void> => {
    const { phone, date, startHour } = req.body;
    sendData(
      res,
      await this.bookingService.rescheduleByCustomer(req.params.id, phone, date, startHour),
    );
  };
}
