import { env } from '../config/env-config';
import { PrismaService } from '../config/prisma.config';
import { seedAdminAccount } from './admin.seeder';

// Idempotent seed: safe to run repeatedly. Re-running keeps admin-edited settings.
const prisma = PrismaService.getInstance().client;

const main = async () => {
  const venueId = env.DEFAULT_VENUE_ID;

  await prisma.venue.upsert({
    where: { id: venueId },
    update: {},
    create: {
      id: venueId,
      name: 'The Riverside Cricket Box',
      area: 'Ashmavati Riverfront',
      city: 'Porbandar',
      address: 'At Ashmavati Riverfront, Opp. Jalaram Colony, M. G. Road, Porbandar',
      description:
        'A riverside box cricket arena on the Ashmavati Riverfront in Porbandar. Floodlit turf, ' +
        'parking, washrooms, a changing room and a cafe - open 24 hours so you can play ' +
        'whenever your team is free.',
      phone: '+91 75071 97507',
      openHour: 0,
      closeHour: 24,
      minHours: 1,
      maxHours: 24,
      advanceDays: 14,
    },
  });

  await prisma.pitch.upsert({
    where: { id: 'main' },
    update: {},
    create: { id: 'main', venueId, name: 'Main Box', size: '90 x 45 ft', format: '6-a-side' },
  });

  await prisma.venueSettings.upsert({
    where: { venueId },
    update: {},
    create: { venueId, hourlyRatePaise: 90_000, additionalChargePaise: 2_000, gstRateBps: 0 },
  });

  // Offers shown in the app ("Offers for you"). Values: flat = paise, percent = basis points.
  const offers = [
    {
      code: 'WELCOME20',
      title: 'First game on us',
      description: '20% off your first booking, up to ₹300.',
      kind: 'percent' as const,
      value: 2_000,
      maxDiscountPaise: 30_000,
      minHours: 1,
      weekdaysOnly: false,
      accent: 'lime',
    },
    {
      code: 'WEEKDAY100',
      title: 'Weekday warm-up',
      description: 'Flat ₹100 off on 2+ hours, Monday to Friday.',
      kind: 'flat' as const,
      value: 10_000,
      maxDiscountPaise: null,
      minHours: 2,
      weekdaysOnly: true,
      accent: 'sky',
    },
    {
      code: 'TEAM15',
      title: 'Full match package',
      description: '15% off when you play 3+ hours, up to ₹400.',
      kind: 'percent' as const,
      value: 1_500,
      maxDiscountPaise: 40_000,
      minHours: 3,
      weekdaysOnly: false,
      accent: 'ball',
    },
    {
      code: 'RIVER50',
      title: 'Riverside special',
      description: 'Flat ₹50 off on any booking.',
      kind: 'flat' as const,
      value: 5_000,
      maxDiscountPaise: null,
      minHours: 1,
      weekdaysOnly: false,
      accent: 'amber',
    },
  ];
  for (const offer of offers) {
    await prisma.offer.upsert({
      where: { venueId_code: { venueId, code: offer.code } },
      update: {},
      create: { venueId, ...offer },
    });
  }

  // First admin account. Create-only: re-running the seed never resets a changed password.
  const { email, created } = await seedAdminAccount(prisma);
  // The old PIN-based demo account cannot sign in with email/password; keep it for history only.
  await prisma.staffUser.updateMany({ where: { id: 'staff-demo' }, data: { active: false } });

  console.info(
    `Seeded venue "${venueId}", pitch "main", ${offers.length} offers and admin ${email}` +
      (created ? '.' : ' (already existed, password unchanged).'),
  );
};

main()
  .catch(error => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => PrismaService.getInstance().disconnect());
