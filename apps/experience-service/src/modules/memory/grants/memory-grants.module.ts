import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { MemoryCardsModule } from '../cards/memory-cards.module';
import { MemoryContentsModule } from '../contents/memory-contents.module';
import { MEMORY_GRANT_REPOSITORY } from './application/memory-grant.repository';
import {
  CreateAccessGrantUseCase,
  GetMemoryBySessionUseCase,
  ListAccessGrantsUseCase,
  RedeemInvitationUseCase,
  RevokeAccessGrantUseCase,
} from './application/memory-grant.use-cases';
import { PrismaMemoryGrantRepository } from './infrastructure/prisma-memory-grant.repository';
import { MemoryGrantGrpcController } from './presentation/memory-grant.grpc.controller';

@Module({
  imports: [PrismaModule, MemoryCardsModule, MemoryContentsModule],
  controllers: [MemoryGrantGrpcController],
  providers: [
    {
      provide: MEMORY_GRANT_REPOSITORY,
      useClass: PrismaMemoryGrantRepository,
    },
    CreateAccessGrantUseCase,
    ListAccessGrantsUseCase,
    RevokeAccessGrantUseCase,
    RedeemInvitationUseCase,
    GetMemoryBySessionUseCase,
  ],
  exports: [MEMORY_GRANT_REPOSITORY],
})
export class MemoryGrantsModule {}
