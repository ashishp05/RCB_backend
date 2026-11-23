import { Request, Response } from 'express';

import { sendData } from '../../../utils/response.util';
import { VisitorService } from '../services/visitor.service';
import {
  SendOtpInput,
  SimpleLoginInput,
  UpdateProfileInput,
  VerifyOtpInput,
} from '../types/visitor.types';

export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  simpleLogin = async (req: Request<{}, {}, SimpleLoginInput>, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.simpleLogin(req.body));
  };

  sendOtp = async (req: Request<{}, {}, SendOtpInput>, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.sendOtp(req.body.phone));
  };

  verifyOtp = async (req: Request<{}, {}, VerifyOtpInput>, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.verifyOtp(req.body));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.me(req.visitor!.phone));
  };

  updateMe = async (req: Request<{}, {}, UpdateProfileInput>, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.updateProfile(req.visitor!.phone, req.body));
  };
}
