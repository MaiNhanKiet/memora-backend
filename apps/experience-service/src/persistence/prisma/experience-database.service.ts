import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toExperiencePoolConnectionString } from '@app/config';
import { Pool } from 'pg';
import {
  EXPERIENCE_POOL_MAX,
  EXPERIENCE_POSTGRES_SCHEMAS,
} from './experience-postgres.constants';

interface DatabaseProbeRow {
  database: string;
  superuser: boolean;
}

interface SchemaProbeRow {
  name: string;
}

export interface ExperienceDatabaseProbe {
  readonly connected: boolean;
  readonly database?: string;
  readonly superuser?: boolean;
  readonly presentSchemas?: readonly string[];
}

@Injectable()
export class ExperienceDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(ExperienceDatabaseService.name);
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    this.pool = new Pool({
      connectionString: toExperiencePoolConnectionString(
        configService.getOrThrow<string>('experience.databaseUrl'),
      ),
      max: EXPERIENCE_POOL_MAX,
      connectionTimeoutMillis: 5000,
      application_name: 'experience-service',
      options: `-c search_path=${EXPERIENCE_POSTGRES_SCHEMAS.join(',')}`,
    });
  }

  /**
   * The single process pool. A future Prisma adapter must use this instance.
   */
  getPool(): Pool {
    return this.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Experience PostgreSQL pool closed');
  }

  async probe(): Promise<ExperienceDatabaseProbe> {
    try {
      await this.pool.query('SELECT 1');
      const meta = await this.pool.query<DatabaseProbeRow>(
        `SELECT current_database()::text AS database,
                r.rolsuper AS superuser
         FROM pg_catalog.pg_roles r
         WHERE r.rolname = current_user`,
      );
      const schemas = await this.pool.query<SchemaProbeRow>(
        `SELECT nspname::text AS name
         FROM pg_catalog.pg_namespace
         WHERE nspname = ANY($1::text[])`,
        [[...EXPERIENCE_POSTGRES_SCHEMAS]],
      );
      const row = meta.rows[0];
      if (!row) {
        this.logger.warn('Experience PostgreSQL readiness probe failed (role)');
        return { connected: false };
      }
      return {
        connected: true,
        database: row.database,
        superuser: row.superuser,
        presentSchemas: schemas.rows.map((schema) => schema.name),
      };
    } catch (error) {
      this.logger.warn(
        `Experience PostgreSQL readiness probe failed (${safeDbErrorCode(error)})`,
      );
      return { connected: false };
    }
  }
}

function safeDbErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return 'unavailable';
  }
  const code = error.code;
  if (typeof code !== 'string') {
    return 'unavailable';
  }
  if (/^[0-9A-Z]{5}$/.test(code) || /^E[A-Z0-9_]+$/.test(code)) {
    return code;
  }
  return 'unavailable';
}
