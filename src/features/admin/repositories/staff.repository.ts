import { PrismaClient } from '@prisma/client';

export class StaffRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findActive() {
    return this.prisma.staffUser.findMany({ where: { active: true } });
  }

  async findById(id: string) {
    return this.prisma.staffUser.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, active: true },
    });
  }
}
