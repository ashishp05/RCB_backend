import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages, ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendJsonResponse } from '../../../utils/response.util';
import { AdminAuthService } from '../services/admin-auth.service';
import {
  AdminChangePasswordInput,
  AdminLoginInput,
  AdminRegisterInput,
} from '../types/admin.types';

export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  register = async (req: Request<{}, {}, AdminRegisterInput>, res: Response): Promise<void> => {
    const result = await this.adminAuthService.register(req.body);
    sendJsonResponse(res, result, ResponseMessages.REGISTRATION_SUCCESSFUL, StatusCodes.CREATED);
  };

  login = async (req: Request<{}, {}, AdminLoginInput>, res: Response): Promise<void> => {
    const result = await this.adminAuthService.login(req.body);
    sendJsonResponse(res, result, ResponseMessages.LOGIN_SUCCESSFUL, StatusCodes.OK);
  };

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const adminId = req.userId;
    if (!adminId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.UNAUTHORIZED);
    }

    const profile = await this.adminAuthService.getProfile(adminId);
    sendJsonResponse(res, profile, ResponseMessages.PROFILE_FETCH_SUCCESS, StatusCodes.OK);
  };

  changePassword = async (
    req: Request<{}, {}, AdminChangePasswordInput>,
    res: Response,
  ): Promise<void> => {
    const adminId = req.userId;
    if (!adminId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.UNAUTHORIZED);
    }

    await this.adminAuthService.changePassword(adminId, req.body);
    sendJsonResponse(res, true, ResponseMessages.PASSWORD_CHANGED_SUCCESS, StatusCodes.OK);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    sendJsonResponse(res, true, ResponseMessages.LOGOUT_SUCCESSFUL, StatusCodes.OK);
  };
}
