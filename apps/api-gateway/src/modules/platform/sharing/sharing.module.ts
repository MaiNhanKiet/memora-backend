import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import {
  PlatformSharingGrpcClient,
  experiencePlatformSharingGrpcClientOptions,
} from './clients/platform-sharing-grpc.client';
import { SharingController } from './controllers/sharing.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([experiencePlatformSharingGrpcClientOptions()]),
  ],
  controllers: [SharingController],
  providers: [PlatformSharingGrpcClient],
  exports: [PlatformSharingGrpcClient],
})
export class SharingModule {}
