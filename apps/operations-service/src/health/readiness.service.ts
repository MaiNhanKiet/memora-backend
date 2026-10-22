import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OPERATIONS_OWNED_SCHEMAS, type NodeEnvName } from '@app/config';
import { OperationsDatabaseService } from '../persistence/prisma/operations-database.service';
import {
  buildOperationsReadinessReport,
  unavailableOperationsReport,
  type OperationsHealthReport,
} from './operations-readiness';

@Injectable()
export class OperationsReadinessService implements OnModuleInit {
  private readonly logger = new Logger(OperationsReadinessService.name);

  constructor(
    private readonly database: OperationsDatabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const report = await this.report();
    if (report.ready) {
      this.logger.log(
        'Operations PostgreSQL connected (database=memora, schemas=personalization,production,fulfillment,after_sales)',
      );
      return;
    }
    this.logger.error('Operations PostgreSQL is not ready');
  }

  async report(): Promise<OperationsHealthReport> {
    const probe = await this.database.probe();
    if (
      !probe.connected ||
      probe.database === undefined ||
      probe.superuser === undefined ||
      probe.presentSchemas === undefined
    ) {
      return unavailableOperationsReport();
    }

    const report = buildOperationsReadinessReport({
      database: probe.database,
      superuser: probe.superuser,
      presentSchemas: probe.presentSchemas,
      nodeEnv: this.config.getOrThrow<NodeEnvName>('operations.nodeEnv'),
    });
    this.logReport(report);
    return report;
  }

  async isReady(): Promise<boolean> {
    const ready = await this.report();
    return ready.ready;
  }

  private logReport(report: OperationsHealthReport): void {
    if (report.database === 'rejected') {
      this.logger.warn('Operations PostgreSQL database must be memora');
    }
    if (report.runtimeRole === 'rejected') {
      this.logger.warn(
        'Operations PostgreSQL runtime must not be a superuser in production',
      );
    }
    const missing = OPERATIONS_OWNED_SCHEMAS.filter(
      (schema) => report.schemas?.[schema] === 'missing',
    );
    if (missing.length > 0) {
      this.logger.warn(
        `Operations PostgreSQL schemas missing: ${missing.join(',')}`,
      );
    }
  }
}
