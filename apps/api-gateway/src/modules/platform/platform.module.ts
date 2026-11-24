import { Module } from '@nestjs/common';
import { SharingModule } from './sharing/sharing.module';

@Module({
  imports: [SharingModule],
  exports: [SharingModule],
})
export class PlatformModule {}
