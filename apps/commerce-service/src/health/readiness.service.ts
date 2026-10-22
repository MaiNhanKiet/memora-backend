import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { COMMERCE_OWNED_SCHEMAS, type NodeEnvName } from '@app/config';
import { CommerceDatabaseService } from '../persistence/prisma/commerce-database.service';
import {
  buildCommerceReadinessReport,
  unavailableCommerceReport,
  type CommerceHealthReport,
} from './commerce-readiness';

@Injectable()
export class CommerceReadinessService implements OnModuleInit {
  private readonly logger = new Logger(CommerceReadinessService.name);

  constructor(
    private readonly database: CommerceDatabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const report = await this.report();
    if (report.ready) {
      this.logger.log(
        'Commerce PostgreSQL connected (database=memora, schemas=catalog,pricing,inventory,design,ordering)',
      );
      return;
    }
    this.logger.error('Commerce PostgreSQL is not ready');
  }

  async report(): Promise<CommerceHealthReport> {
    const probe = await this.database.probe();
    if (
      !probe.connected ||
      probe.database === undefined ||
      probe.superuser === undefined ||
      probe.presentSchemas === undefined
    ) {
      return unavailableCommerceReport();
    }

    const report = buildCommerceReadinessReport({
      database: probe.database,
      superuser: probe.superuser,
      presentSchemas: probe.presentSchemas,
      nodeEnv: this.config.getOrThrow<NodeEnvName>('commerce.nodeEnv'),
    });
    this.logReport(report);
    return report;
  }

  async isReady(): Promise<boolean> {
    const report = await this.report();
    return report.ready;
  }

  private logReport(report: CommerceHealthReport): void {
    if (report.database === 'rejected') {
      this.logger.warn('Commerce PostgreSQL database must be memora');
    }
    if (report.runtimeRole === 'rejected') {
      this.logger.warn(
        'Commerce PostgreSQL runtime must not be a superuser in production',
      );
    }
    const missing = COMMERCE_OWNED_SCHEMAS.filter(
      (schema) => report.schemas?.[schema] === 'missing',
    );
    if (missing.length > 0) {
      this.logger.warn(
        `Commerce PostgreSQL schemas missing: ${missing.join(',')}`,
      );
    }
  }
}
