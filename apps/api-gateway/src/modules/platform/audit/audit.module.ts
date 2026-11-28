import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  PlatformAuditGrpcClient,
  experiencePlatformAuditGrpcClientOptions,
} from './clients/platform-audit-grpc.client';
import { AdminAuditController } from './controllers/admin-audit.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([experiencePlatformAuditGrpcClientOptions()]),
  ],
  controllers: [AdminAuditController],
  providers: [PlatformAuditGrpcClient],
  exports: [PlatformAuditGrpcClient],
})
export class AuditModule {}
