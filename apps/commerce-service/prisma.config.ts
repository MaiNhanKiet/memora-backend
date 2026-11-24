import { defineConfig, env } from 'prisma/config';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({
  path: resolve(__dirname, '../../.env'),
  override: false,
  quiet: true,
});

// Prisma keeps `_prisma_migrations` in the schema named by the URL (`public` when absent).
// Pin it to a schema this service owns, so Commerce, Operations and Experience never share
// one migrations table and the `*_migrate` role only needs rights on its own schemas.
const MIGRATIONS_SCHEMA = 'catalog';

function withMigrationsSchema(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set('schema', MIGRATIONS_SCHEMA);
  return parsed.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: withMigrationsSchema(env('COMMERCE_DATABASE_URL')),
  },
});
