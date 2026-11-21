import bcrypt from 'bcrypt';

import { env } from '../config/env-config';
import { PrismaService } from '../config/prisma.config';
import { BCRYPT_SALT_ROUNDS, StaffRoles } from '../constants/config.constants';

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

  await prisma.offer.upsert({
    where: { venueId_code: { venueId, code: 'RIVER50' } },
    update: {},
    create: {
      venueId,
      code: 'RIVER50',
      description: 'Rs 50 off your booking',
      kind: 'flat',
      value: 5_000,
    },
  });

  const pinHash = await bcrypt.hash(env.STAFF_DEMO_PIN, BCRYPT_SALT_ROUNDS);
  await prisma.staffUser.upsert({
    where: { id: 'staff-demo' },
    update: { pinHash },
    create: { id: 'staff-demo', name: 'Counter Admin', pinHash, role: StaffRoles.ADMIN },
  });

  console.info(`Seeded venue "${venueId}", pitch "main", offer RIVER50 and staff-demo.`);
};

main()
  .catch(error => {
    console.error('Seed failed', error);
    process.exitCode = 1;
  })
  .finally(() => PrismaService.getInstance().disconnect());
