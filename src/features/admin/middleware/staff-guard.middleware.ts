import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { StaffRole } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { auth } from '../../../middleware/auth.middleware';
import { ApiError } from '../../../utils/api-error.util';
import { StaffRepository } from '../repositories/staff.repository';

// JWT check + live account check: the account must still exist, be active, and the token's
// session version must match (password change / logout-all / deactivation revoke old tokens).
export const createStaffGuard =
  (staffRepository: StaffRepository) =>
  (roles: readonly StaffRole[]): RequestHandler[] => [
    auth,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const staff = req.userId ? await staffRepository.findById(req.userId) : null;
      if (!staff || !staff.active || staff.tokenVersion !== req.tokenVersion) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.SESSION_EXPIRED);
      }
      if (!roles.includes(staff.role as StaffRole)) {
        throw new ApiError(StatusCodes.FORBIDDEN, ValidationMessages.NOT_ALLOWED);
      }
      req.role = staff.role;
      next();
    },
  ];
