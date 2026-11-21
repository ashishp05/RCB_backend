import { env } from './src/config/env-config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: env.DATABASE_URL,
  },
});
