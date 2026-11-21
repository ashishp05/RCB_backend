import { Server as HttpServer } from 'http';

import { app } from './app';
import { env } from './config/env-config';
import { PrismaService } from './config/prisma.config';

const SHUTDOWN_TIMEOUT_MS = 10000;

class Server {
  private readonly port: number;
  private serverInstance: HttpServer | undefined;
  private readonly prisma: PrismaService;

  constructor(port: number) {
    this.port = port;
    this.prisma = PrismaService.getInstance();
  }

  // Start the server
  public start(): void {
    this.serverInstance = app.listen(this.port, () => {
      console.info(`Server running at http://localhost:${this.port}`);
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
server.start();
