import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages, ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendData } from '../../../utils/response.util';
import { AdminAuthService } from '../services/admin-auth.service';
import {
  AdminLoginInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../types/admin.types';

export const staffIdOf = (req: Request): string => {
  if (!req.userId) throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.UNAUTHORIZED);
  return req.userId;
};

export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  login = async (req: Request<{}, {}, AdminLoginInput>, res: Response): Promise<void> => {
    sendData(res, await this.adminAuthService.login(req.body));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    sendData(res, await this.adminAuthService.me(staffIdOf(req)));
  };

  changePassword = async (
    req: Request<{}, {}, ChangePasswordInput>,
    res: Response,
  ): Promise<void> => {
    sendData(res, await this.adminAuthService.changePassword(staffIdOf(req), req.body));
  };

  // Tokens are stateless: the client discards its token. Use logout-all to revoke everywhere.
  logout = async (req: Request, res: Response): Promise<void> => {
    sendData(res, { message: ResponseMessages.LOGOUT_SUCCESSFUL });
  };

  logoutAll = async (req: Request, res: Response): Promise<void> => {
    await this.adminAuthService.logoutAll(staffIdOf(req));
    sendData(res, { message: ResponseMessages.LOGOUT_SUCCESSFUL });
  };

  forgotPassword = async (
    req: Request<{}, {}, ForgotPasswordInput>,
    res: Response,
  ): Promise<void> => {
    await this.adminAuthService.forgotPassword(req.body.email);
    sendData(res, { message: ResponseMessages.PASSWORD_RESET_EMAIL_SENT });
  };

  resetPassword = async (
    req: Request<{}, {}, ResetPasswordInput>,
    res: Response,
  ): Promise<void> => {
    await this.adminAuthService.resetPassword(req.body);
    sendData(res, { message: ResponseMessages.PASSWORD_RESET_DONE });
  };
}
