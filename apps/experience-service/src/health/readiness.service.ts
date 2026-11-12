import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXPERIENCE_OWNED_SCHEMAS, type NodeEnvName } from '@app/config';
import { ExperienceDatabaseService } from '../persistence/prisma/experience-database.service';
import {
  buildExperienceReadinessReport,
  unavailableExperienceReport,
  type ExperienceHealthReport,
} from './experience-readiness';

@Injectable()
export class ExperienceReadinessService implements OnModuleInit {
  private readonly logger = new Logger(ExperienceReadinessService.name);

  constructor(
    private readonly database: ExperienceDatabaseService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const report = await this.report();
    if (report.ready) {
      this.logger.log(
        'Experience PostgreSQL connected (database=memora, schemas=memory,platform)',
      );
      return;
    }
    this.logger.error('Experience PostgreSQL is not ready');
  }

  async report(): Promise<ExperienceHealthReport> {
    const probe = await this.database.probe();
    if (
      !probe.connected ||
      probe.database === undefined ||
      probe.superuser === undefined ||
      probe.presentSchemas === undefined
    ) {
      return unavailableExperienceReport();
    }

    const report = buildExperienceReadinessReport({
      database: probe.database,
      superuser: probe.superuser,
      presentSchemas: probe.presentSchemas,
      nodeEnv: this.config.getOrThrow<NodeEnvName>('experience.nodeEnv'),
    });
    this.logReport(report);
    return report;
  }

  async isReady(): Promise<boolean> {
    const report = await this.report();
    return report.ready;
  }

  private logReport(report: ExperienceHealthReport): void {
    if (report.database === 'rejected') {
      this.logger.warn('Experience PostgreSQL database must be memora');
    }
    if (report.runtimeRole === 'rejected') {
      this.logger.warn(
        'Experience PostgreSQL runtime must not be a superuser in production',
      );
    }
    const missing = EXPERIENCE_OWNED_SCHEMAS.filter(
      (schema) => report.schemas?.[schema] === 'missing',
    );
    if (missing.length > 0) {
      this.logger.warn(
        `Experience PostgreSQL schemas missing: ${missing.join(',')}`,
      );
    }
  }
}
