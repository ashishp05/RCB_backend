import { env } from '../../../config/env-config';
import { toRupees } from '../../../utils/money.util';
import { todayInVenue } from '../../../utils/time.util';
import { BookingRepository } from '../../booking/repositories/booking.repository';
import { VenueService } from '../../venue/services/venue.service';

export class AdminDashboardService {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly venueService: VenueService,
  ) {}

  async summary(venueId: string = env.DEFAULT_VENUE_ID, date: string = todayInVenue()) {
    const venue = await this.venueService.getVenueEntity(venueId);
    const stats = await this.bookingRepository.statsForDate(venueId, date);

    const status = (name: string) => stats.byStatus.find(row => row.status === name);
    const confirmed = ['upcoming', 'completed'].map(status);
    const bookedHours = confirmed.reduce((sum, row) => sum + (row?._sum.hours ?? 0), 0);
    const revenuePaise = confirmed.reduce((sum, row) => sum + (row?._sum.totalPaise ?? 0), 0);
    const openHours = (venue.closeHour - venue.openHour) * Math.max(venue.pitches.length, 1);

    return {
      venueId,
      date,
      bookings: confirmed.reduce((sum, row) => sum + (row?._count._all ?? 0), 0),
      bookedHours,
      openHours,
      occupancy: openHours ? Math.round((bookedHours / openHours) * 100) : 0,
      revenue: toRupees(revenuePaise),
      pendingToday: status('pending')?._count._all ?? 0,
      cancelledToday: status('cancelled')?._count._all ?? 0,
      byChannel: stats.byChannel.map(row => ({
        channel: row.channel,
        bookings: row._count._all,
        revenue: toRupees(row._sum.totalPaise ?? 0),
      })),
      pendingTotal: stats.pendingTotal,
      upcomingTotal: stats.upcomingTotal,
    };
  }

  qrLink() {
    const url = new URL('/book', env.PUBLIC_SITE_URL);
    url.searchParams.set('src', 'qr');
    return { url: url.toString() };
  }
}
