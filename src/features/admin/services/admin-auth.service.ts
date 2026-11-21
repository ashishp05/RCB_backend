import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';

import { BCRYPT_SALT_ROUNDS } from '../../../constants/config.constants';
import { ValidationMessages } from '../../../constants/messages';
import { ApiError } from '../../../utils/api-error.util';
import { generateToken } from '../../../utils/generate-token.util';
import { AdminRepository } from '../repositories/admin.repository';
import {
  AdminAuthResponse,
  AdminChangePasswordInput,
  AdminLoginInput,
  AdminProfileResponse,
  AdminRegisterInput,
  AdminRoles,
} from '../types/admin.types';

const formatAdminProfile = (admin: AdminProfileResponse): AdminProfileResponse => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  image: admin.image ?? null,
  active: admin.active,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

export class AdminAuthService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async register(data: AdminRegisterInput): Promise<AdminAuthResponse> {
    const existingAdmin = await this.adminRepository.findByEmail(data.email);
    if (existingAdmin) {
      throw new ApiError(StatusCodes.CONFLICT, ValidationMessages.ADMIN_EXISTS_WITH_EMAIL);
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
    const admin = await this.adminRepository.create({ ...data, password: hashedPassword });

    return {
      token: generateToken(admin.id, AdminRoles.SUPER_ADMIN),
      admin: formatAdminProfile(admin),
    };
  }

  async login(data: AdminLoginInput): Promise<AdminAuthResponse> {
    const admin = await this.adminRepository.findByEmail(data.email);
    if (!admin) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.INVALID_CREDENTIALS);
    }

    if (!admin.active) {
      throw new ApiError(StatusCodes.FORBIDDEN, ValidationMessages.ACCOUNT_INACTIVE);
    }

    const isPasswordValid = await bcrypt.compare(data.password, admin.password);
    if (!isPasswordValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, ValidationMessages.INVALID_CREDENTIALS);
    }

    return {
      token: generateToken(admin.id, AdminRoles.SUPER_ADMIN),
      admin: formatAdminProfile(admin),
    };
  }

  async getProfile(adminId: string): Promise<AdminProfileResponse> {
    const admin = await this.adminRepository.findById(adminId);
    if (!admin) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.ADMIN_NOT_FOUND);
    }

    return formatAdminProfile(admin);
  }

  async changePassword(adminId: string, data: AdminChangePasswordInput): Promise<boolean> {
    const admin = await this.adminRepository.findByIdWithPassword(adminId);
    if (!admin) {
      throw new ApiError(StatusCodes.NOT_FOUND, ValidationMessages.ADMIN_NOT_FOUND);
    }

    const isOldPasswordValid = await bcrypt.compare(data.oldPassword, admin.password);
    if (!isOldPasswordValid) {
      throw new ApiError(StatusCodes.BAD_REQUEST, ValidationMessages.OLD_PASSWORD_INCORRECT);
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, BCRYPT_SALT_ROUNDS);
    await this.adminRepository.updatePassword(adminId, hashedPassword);

    return true;
  }
}
