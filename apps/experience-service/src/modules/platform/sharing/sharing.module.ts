import { Module } from '@nestjs/common';
import { SharingRepository } from './infrastructure/sharing.repository';
import { SharingService } from './application/sharing.service';
import { SharingGrpcController } from './presentation/sharing.grpc.controller';

@Module({
  controllers: [SharingGrpcController],
  providers: [SharingRepository, SharingService],
  exports: [SharingService],
})
export class SharingModule {}
