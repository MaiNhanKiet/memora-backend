import { Module } from '@nestjs/common';
import { AUDIT_REPOSITORY } from './application/audit.repository';
import {
  ListAuditLogsUseCase,
  RecordAuditEventUseCase,
} from './application/audit.use-cases';
import { PrismaAuditRepository } from './infrastructure/prisma-audit.repository';
import { AuditGrpcController } from './presentation/audit.grpc.controller';

@Module({
  controllers: [AuditGrpcController],
  providers: [
    { provide: AUDIT_REPOSITORY, useClass: PrismaAuditRepository },
    ListAuditLogsUseCase,
    RecordAuditEventUseCase,
  ],
  exports: [AUDIT_REPOSITORY, RecordAuditEventUseCase],
})
export class AuditModule {}
