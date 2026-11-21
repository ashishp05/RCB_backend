import { PrismaClient } from '@prisma/client';

import { AdminRegisterInput } from '../types/admin.types';

// Never return the password hash outside the repository.
const adminProfileSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export class AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string) {
    return this.prisma.admin.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.admin.findUnique({ where: { id }, select: adminProfileSelect });
  }

  async findByIdWithPassword(id: string) {
    return this.prisma.admin.findUnique({ where: { id } });
  }

  async create(data: AdminRegisterInput) {
    return this.prisma.admin.create({ data, select: adminProfileSelect });
  }

  async updatePassword(id: string, passwordHash: string) {
    return this.prisma.admin.update({
      where: { id },
      data: { password: passwordHash },
      select: adminProfileSelect,
    });
  }
}
