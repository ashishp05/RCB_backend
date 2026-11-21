import { Prisma } from '@prisma/client';

import { BOOKING_RULES } from '../constants/config.constants';
import { BookingRepository } from '../features/booking/repositories/booking.repository';

// Releases expired holds and unpaid bookings, and marks finished games completed.
export class BookingSweeperJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private databaseDown = false;

  constructor(private readonly bookingRepository: BookingRepository) {}

  start(): void {
    if (this.timer) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), BOOKING_RULES.SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async run(): Promise<void> {
    // Skip a tick rather than overlap a slow run.
    if (this.running) return;
    this.running = true;
    try {
      const released = await this.bookingRepository.releaseExpired();
      const completed = await this.bookingRepository.completeFinished();
      if (released.holds || released.pendingReleased || completed) {
        console.info(
          `[sweeper] holds released: ${released.holds}, unpaid released: ${released.pendingReleased}, completed: ${completed}`,
        );
      }
      if (this.databaseDown) {
        console.info('[sweeper] database reachable again');
        this.databaseDown = false;
      }
    } catch (error) {
      // Log a lost connection once (not a full stack every minute); retry on the next tick.
      const unreachable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001';
      if (!unreachable) {
        console.error('[sweeper] run failed', error);
      } else if (!this.databaseDown) {
        console.warn('[sweeper] database unreachable; will retry every minute');
        this.databaseDown = true;
      }
    } finally {
      this.running = false;
    }
  }
}
