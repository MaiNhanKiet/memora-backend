import { Module } from '@nestjs/common';
import { AuditRepository } from './infrastructure/audit.repository';
import { AuditService } from './application/audit.service';
import { AuditGrpcController } from './presentation/audit.grpc.controller';

@Module({
  controllers: [AuditGrpcController],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
