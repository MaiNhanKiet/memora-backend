import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../../generated/prisma/client';
import {
  COMMERCE_POOL_MAX,
  COMMERCE_POSTGRES_DATABASE,
  COMMERCE_POSTGRES_SCHEMAS,
} from './commerce-postgres.constants';

type DatabaseConnectionProbe = {
  database: string;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const connectionString = configService.getOrThrow<string>(
      'commerce.databaseUrl',
    );
    const pool = new Pool({
      connectionString,
      max: COMMERCE_POOL_MAX,
      options: `-c search_path=${COMMERCE_POSTGRES_SCHEMAS.join(',')}`,
    });

    super({
      adapter: new PrismaPg(pool),
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      await this.assertDatabaseConnection();
    } catch (error) {
      this.logger.error('Commerce Prisma connection failed', error);
      throw new Error('Commerce Prisma connection failed');
    }

    this.logger.log(
      `Commerce PostgreSQL connected (database=${COMMERCE_POSTGRES_DATABASE}, schemas=${COMMERCE_POSTGRES_SCHEMAS.join(',')})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } finally {
      await this.pool.end();
      this.logger.log('Commerce Prisma disconnected');
    }
  }

  private async assertDatabaseConnection(): Promise<void> {
    const rows = await this.$queryRaw<DatabaseConnectionProbe[]>`
      SELECT current_database()::text AS database
    `;
    const probe = rows[0];

    if (probe?.database !== COMMERCE_POSTGRES_DATABASE) {
      throw new Error(
        `Commerce Prisma must use database "${COMMERCE_POSTGRES_DATABASE}", found "${probe?.database}"`,
      );
    }
  }
}
