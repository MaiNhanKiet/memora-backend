import { Module } from '@nestjs/common';
import { SHARING_REPOSITORY } from './application/sharing.repository';
import {
  CreateShareLinkUseCase,
  ResolveShareLinkUseCase,
  RevokeShareLinkUseCase,
} from './application/sharing.use-cases';
import { PrismaSharingRepository } from './infrastructure/prisma-sharing.repository';
import { SharingGrpcController } from './presentation/sharing.grpc.controller';

@Module({
  controllers: [SharingGrpcController],
  providers: [
    { provide: SHARING_REPOSITORY, useClass: PrismaSharingRepository },
    ResolveShareLinkUseCase,
    CreateShareLinkUseCase,
    RevokeShareLinkUseCase,
  ],
  exports: [SHARING_REPOSITORY],
})
export class SharingModule {}
