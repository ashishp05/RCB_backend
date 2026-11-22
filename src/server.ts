import { Server as HttpServer } from 'http';

import { app } from './app';
import { env } from './config/env-config';
import { PrismaService } from './config/prisma.config';
import { container } from './container';
import { BookingSweeperJob } from './jobs/booking-sweeper.job';
import { seedAdminAccount } from './seeds/admin.seeder';

const SHUTDOWN_TIMEOUT_MS = 10000;

// "postgresql://user:secret@host:5432/db?x" -> "host:5432/db" (never print credentials).
const describeDatabaseUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
  } catch {
    return 'the configured DATABASE_URL';
  }
};

class Server {
  private readonly port: number;
  private serverInstance: HttpServer | undefined;
  private readonly prisma: PrismaService;
  private readonly sweeper: BookingSweeperJob;

  constructor(port: number) {
    this.port = port;
    this.prisma = PrismaService.getInstance();
    this.sweeper = new BookingSweeperJob(container.bookingRepository, container.visitorService);
  }

  // Start the server once the database answers; fail fast with a readable message otherwise.
  public async start(): Promise<void> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch (error) {
      const target = describeDatabaseUrl(env.DATABASE_URL);
      console.error(
        `❌ Cannot connect to PostgreSQL at ${target}.\n` +
          '   Make sure the PostgreSQL server is installed and running, the database exists,\n' +
          '   and DATABASE_URL in .env is correct. Then run: npx prisma migrate deploy\n' +
          `   Cause: ${error instanceof Error ? error.message.split('\n').pop() : String(error)}`,
      );
      await this.prisma.disconnect().catch(() => undefined);
      process.exit(1);
    }

    // Make sure the ADMIN_SEED_* admin can log in on a fresh database.
    try {
      const admin = await seedAdminAccount(this.prisma.client);
      if (admin.created)
        console.info(`✅ Created admin account ${admin.email} (from ADMIN_SEED_*)`);
    } catch (error) {
      console.error('Could not ensure the seed admin account', error);
    }

    this.serverInstance = app.listen(this.port, () => {
      console.info(`Server running at http://localhost:${this.port}`);
      this.sweeper.start();
    });

    // Handle system signals for graceful shutdown
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
  }

  // Graceful shutdown logic
  private async gracefulShutdown(): Promise<void> {
    console.info('Received shutdown signal, shutting down gracefully...');
    this.sweeper.stop();
    try {
      // Stop accepting new connections
      this.serverInstance?.close(async () => {
        console.info('No new requests are being accepted.');

        try {
          await this.closeDBConnection();
          console.info('All connections closed, shutting down...');
          process.exit(0); // Successful exit
        } catch (err) {
          console.error('Error during shutdown', err);
          process.exit(1); // Exit with error if closing connections failed
        }
      });

      // Timeout to force shutdown if requests are still pending
      setTimeout(() => {
        console.error('Forcing shutdown due to timeout.');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
    } catch (err) {
      console.error('Failed to initiate graceful shutdown', err);
      process.exit(1); // Exit with error if initial shutdown fails
    }
  }

  // Close database connection
  private async closeDBConnection(): Promise<void> {
    console.info('Closing database connection...');
    try {
      await this.prisma.disconnect(); // Gracefully disconnect Prisma
      console.info('Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection', err);
      throw err; // Re-throw to handle the error in the shutdown sequence
    }
  }

  // Handle uncaught exceptions
  private handleUncaughtException(error: Error): void {
    console.error('Uncaught Exception', error);
    process.exit(1); // Exit with error code for unexpected issues
  }

  // Handle unhandled promise rejections
  private handleUnhandledRejection(reason: unknown): void {
    console.error('Unhandled Rejection', reason);
    process.exit(1); // Exit with error status for unhandled rejections
  }
}

// Initialize and start the server
const server = new Server(env.PORT);
void server.start();
