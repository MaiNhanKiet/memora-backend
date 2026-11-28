import { Module } from '@nestjs/common';
import { SharingModule } from './sharing/sharing.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [SharingModule, AuditModule],
  exports: [SharingModule, AuditModule],
})
export class PlatformModule {}
