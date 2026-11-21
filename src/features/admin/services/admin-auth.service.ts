import { StaffUser } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';

import { env } from '../../../config/env-config';
import { ADMIN_AUTH } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { sendForgotPasswordEmail } from '../../../utils/email.service';
import { generateToken, tokenExpiresInSeconds } from '../../../utils/generate-token.util';
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  verifyPassword,
} from '../../../utils/password.util';
import { minutesFromNow } from '../../../utils/time.util';
import { StaffRepository } from '../repositories/staff.repository';
import {
  AdminLoginInput,
  AdminSessionResponse,
  ChangePasswordInput,
  ResetPasswordInput,
  StaffDto,
} from '../types/admin.types';

export const adminPanelUrl = (): string =>
  (env.ADMIN_PANEL_URL ?? new URL('/admin', env.PUBLIC_SITE_URL).toString()).replace(/\/$/, '');

export const toStaffDto = (staff: StaffDto | StaffUser): StaffDto => ({
  id: staff.id,
  name: staff.name,
  email: staff.email,
  role: staff.role,
  active: staff.active,
  lastLoginAt: staff.lastLoginAt,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

export class AdminAuthService {
  constructor(private readonly staffRepository: StaffRepository) {}

  async login(input: AdminLoginInput): Promise<AdminSessionResponse> {
    const staff = await this.staffRepository.findByEmail(input.email);
    const now = new Date();

    if (staff?.lockedUntil && staff.lockedUntil > now) {
      throw new ApiError(StatusCodes.TOO_MANY_REQUESTS, ValidationMessages.ACCOUNT_LOCKED);
    }
    // Always run bcrypt, even for unknown emails, so timing does not reveal accounts.
    const passwordOk = await verifyPassword(input.password, staff?.passwordHash);
    if (!staff || !passwordOk) {
      if (staff) await this.registerFailure(staff, now);
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.INVALID_CREDENTIALS);
    }
    if (!staff.active) {
      throw new ApiError(StatusCodes.FORBIDDEN, ValidationMessages.ACCOUNT_INACTIVE);
    }

    await this.staffRepository.recordSuccessfulLogin(staff.id);
    return this.session({ ...staff, lastLoginAt: now });
  }

  async me(staffId: string): Promise<StaffDto> {
    const staff = await this.staffRepository.findPublicById(staffId);
    if (!staff) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.STAFF_NOT_FOUND);
    return toStaffDto(staff);
  }

  // Revokes all of the user's existing tokens and returns a fresh session for this device.
  async changePassword(staffId: string, input: ChangePasswordInput): Promise<AdminSessionResponse> {
    const staff = await this.staffRepository.findById(staffId);
    if (!staff) throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.STAFF_NOT_FOUND);
    if (!(await verifyPassword(input.currentPassword, staff.passwordHash))) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OLD_PASSWORD_INCORRECT);
    }
    if (input.currentPassword === input.newPassword) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.PASSWORD_SAME_AS_OLD);
    }
    const updated = await this.staffRepository.setPassword(
      staffId,
      await hashPassword(input.newPassword),
    );
    return this.session(updated);
  }

  // Signs out every device for this account.
  async logoutAll(staffId: string): Promise<void> {
    await this.staffRepository.bumpTokenVersion(staffId);
  }

  // Same response whether or not the email exists, so accounts cannot be enumerated.
  async forgotPassword(email: string): Promise<void> {
    const staff = await this.staffRepository.findByEmail(email);
    if (!staff || !staff.active) return;

    const { token, tokenHash } = generateResetToken();
    await this.staffRepository.setResetToken(
      staff.id,
      tokenHash,
      minutesFromNow(ADMIN_AUTH.RESET_TOKEN_TTL_MINUTES),
    );
    const resetLink = `${adminPanelUrl()}/reset-password?token=${token}`;
    const result = await sendForgotPasswordEmail({
      email: staff.email,
      name: staff.name,
      resetLink,
    });

    if (env.DISABLE_EMAIL && env.NODE_ENV !== 'production') {
      console.info(`[dev] Password reset link for ${staff.email}: ${resetLink}`);
    } else if (!result.success) {
      console.error(`Password reset email to ${staff.email} failed`, result);
    }
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const staff = await this.staffRepository.findByValidResetToken(hashResetToken(input.token));
    if (!staff) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.RESET_TOKEN_INVALID);
    }
    await this.staffRepository.setPassword(staff.id, await hashPassword(input.newPassword));
  }

  private async registerFailure(staff: StaffUser, now: Date): Promise<void> {
    const attempts = staff.failedLoginAttempts + 1;
    const locked = attempts >= ADMIN_AUTH.MAX_FAILED_LOGINS;
    await this.staffRepository.recordFailedLogin(
      staff.id,
      locked ? 0 : attempts,
      locked ? minutesFromNow(ADMIN_AUTH.LOCKOUT_MINUTES, now) : null,
    );
  }

  private session(staff: StaffUser): AdminSessionResponse {
    const token = generateToken(staff.id, staff.role, staff.tokenVersion);
    return {
      token,
      tokenType: 'Bearer',
      expiresIn: tokenExpiresInSeconds(token),
      staffId: staff.id,
      staff: toStaffDto(staff),
    };
  }
}
