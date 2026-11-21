import { Request, Response } from 'express';

import { sendData } from '../../../utils/response.util';
import { PaymentService } from '../services/payment.service';
import { CreateOrderInput, VerifyPaymentInput } from '../types/payment.types';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createOrder = async (req: Request<{}, {}, CreateOrderInput>, res: Response): Promise<void> => {
    sendData(res, await this.paymentService.createOrder(req.body));
  };

  verify = async (req: Request<{}, {}, VerifyPaymentInput>, res: Response): Promise<void> => {
    sendData(res, await this.paymentService.verify(req.body));
  };

  // Body is a raw Buffer (see app.ts) so the HMAC is computed over the exact bytes received.
  webhook = async (req: Request, res: Response): Promise<void> => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    await this.paymentService.handleWebhook(rawBody, req.get('x-razorpay-signature'));
    sendData(res, { received: true });
  };
}
