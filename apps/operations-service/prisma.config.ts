import { defineConfig, env } from 'prisma/config';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({
  path: resolve(__dirname, '../../.env'),
  override: false,
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('OPERATIONS_DATABASE_URL'),
  },
});
