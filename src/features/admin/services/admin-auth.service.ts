import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';

import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { generateToken } from '../../../utils/generate-token.util';
import { StaffRepository } from '../repositories/staff.repository';
import { StaffLoginResponse } from '../types/admin.types';

export class AdminAuthService {
  constructor(private readonly staffRepository: StaffRepository) {}

  // PIN-only login: the PIN identifies the staff member. The route is rate limited.
  async login(pin: string): Promise<StaffLoginResponse> {
    const staff = await this.staffRepository.findActive();
    for (const member of staff) {
      if (await bcrypt.compare(pin, member.pinHash)) {
        return {
          token: generateToken(member.id, member.role),
          staffId: member.id,
          name: member.name,
          role: member.role,
        };
      }
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.INVALID_PIN);
  }

  async me(staffId: string) {
    const staff = await this.staffRepository.findById(staffId);
    if (!staff || !staff.active) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.ACCOUNT_INACTIVE);
    }
    return staff;
  }
}
