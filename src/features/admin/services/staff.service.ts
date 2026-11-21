import { StatusCodes } from 'http-status-codes';

import { StaffRoles } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendNewUserInvitationEmail } from '../../../utils/email.service';
import { hashPassword } from '../../../utils/password.util';
import { StaffRepository } from '../repositories/staff.repository';
import { CreateStaffInput, StaffDto, UpdateStaffInput } from '../types/admin.types';
import { adminPanelUrl, toStaffDto } from './admin-auth.service';

// Staff account management (admin role only).
export class StaffService {
  constructor(private readonly staffRepository: StaffRepository) {}

  async list(): Promise<StaffDto[]> {
    return (await this.staffRepository.findAll()).map(toStaffDto);
  }

  async get(id: string): Promise<StaffDto> {
    const staff = await this.staffRepository.findPublicById(id);
    if (!staff) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.STAFF_NOT_FOUND);
    return toStaffDto(staff);
  }

  async create(input: CreateStaffInput): Promise<StaffDto> {
    if (await this.staffRepository.findByEmail(input.email)) {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.STAFF_EMAIL_EXISTS);
    }
    const staff = await this.staffRepository.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    });
    if (input.sendInvite) {
      // The password is not emailed; the admin shares it, or the user uses "forgot password".
      await sendNewUserInvitationEmail({
        email: staff.email,
        name: staff.name,
        role: staff.role,
        loginLink: `${adminPanelUrl()}/login`,
      });
    }
    return toStaffDto(staff);
  }

  async update(actorId: string, id: string, input: UpdateStaffInput): Promise<StaffDto> {
    const staff = await this.staffRepository.findById(id);
    if (!staff) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.STAFF_NOT_FOUND);

    const deactivating = input.active === false && staff.active;
    const demoting = input.role === StaffRoles.STAFF && staff.role === StaffRoles.ADMIN;
    if (actorId === id && (deactivating || demoting)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.CANNOT_DEACTIVATE_SELF);
    }
    if (
      staff.role === StaffRoles.ADMIN &&
      (deactivating || demoting) &&
      (await this.staffRepository.countActiveAdmins(id)) === 0
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.LAST_ADMIN);
    }

    // Role or access changes take effect immediately: existing tokens are revoked.
    const revokeSessions = deactivating || (input.role !== undefined && input.role !== staff.role);
    return toStaffDto(
      await this.staffRepository.update(id, {
        ...input,
        ...(revokeSessions && { tokenVersion: { increment: 1 } }),
      }),
    );
  }

  async setPassword(id: string, newPassword: string): Promise<void> {
    if (!(await this.staffRepository.findById(id))) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.STAFF_NOT_FOUND);
    }
    await this.staffRepository.setPassword(id, await hashPassword(newPassword));
  }
}
