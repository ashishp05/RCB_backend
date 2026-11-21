import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ResponseMessages } from '../../../constants/messages';
import { sendData } from '../../../utils/response.util';
import { StaffService } from '../services/staff.service';
import { AdminSetPasswordInput, CreateStaffInput, UpdateStaffInput } from '../types/admin.types';
import { staffIdOf } from './admin-auth.controller';

type IdParams = { id: string };

export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendData(res, await this.staffService.list());
  };

  get = async (req: Request<IdParams>, res: Response): Promise<void> => {
    sendData(res, await this.staffService.get(req.params.id));
  };

  create = async (req: Request<{}, {}, CreateStaffInput>, res: Response): Promise<void> => {
    sendData(res, await this.staffService.create(req.body), StatusCodes.CREATED);
  };

  update = async (req: Request<IdParams, {}, UpdateStaffInput>, res: Response): Promise<void> => {
    sendData(res, await this.staffService.update(staffIdOf(req), req.params.id, req.body));
  };

  setPassword = async (
    req: Request<IdParams, {}, AdminSetPasswordInput>,
    res: Response,
  ): Promise<void> => {
    await this.staffService.setPassword(req.params.id, req.body.newPassword);
    sendData(res, { message: ResponseMessages.PASSWORD_CHANGED });
  };
}
