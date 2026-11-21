import { BOOKING_RULES } from '../constants/config.constants';
import { BookingRepository } from '../features/booking/repositories/booking.repository';

// Releases expired holds and unpaid bookings, and marks finished games completed.
export class BookingSweeperJob {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

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
    } catch (error) {
      console.error('[sweeper] run failed', error);
    } finally {
      this.running = false;
    }
  }
}
