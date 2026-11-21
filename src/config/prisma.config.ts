import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

import { env } from './env-config';

export class PrismaService {
  private static instance: PrismaService | null = null;
  private prismaClient: PrismaClient;

  private constructor() {
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    this.prismaClient = new PrismaClient({ adapter });
  }

  // Singleton instance
  public static getInstance(): PrismaService {
    if (!this.instance) {
      this.instance = new PrismaService();
    }
    return this.instance;
  }

  // Provide access to the PrismaClient instance
  public get client(): PrismaClient {
    return this.prismaClient;
  }

  // Disconnect the PrismaClient
  public async disconnect(): Promise<void> {
    await this.prismaClient.$disconnect();
  }
}
