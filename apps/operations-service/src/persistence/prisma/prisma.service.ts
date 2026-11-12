import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { OperationsDatabaseService } from './operations-database.service';

/**
 * Prisma client for operations-service repositories (infrastructure layer only).
 * It reuses the service pool owned by OperationsDatabaseService, so there is one pool
 * per process. It does not connect at startup: the first query connects, and
 * /health/ready reports a database outage instead of crashing the process.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(database: OperationsDatabaseService) {
    super({ adapter: new PrismaPg(database.getPool()) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
