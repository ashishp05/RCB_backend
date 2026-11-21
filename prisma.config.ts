import { env } from './src/config/env-config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrations: {
    seed: 'tsx src/seeds/seed.ts',
  },
  datasource: {
    url: env.DATABASE_URL,
  },
});
