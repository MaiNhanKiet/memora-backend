import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import {
  ActivateCardUseCase,
  ProvisionMemoryCardUseCase,
} from './application/card-lifecycle.use-cases';
import {
  ChangePinUseCase,
  ResetPinUseCase,
  SetupPinUseCase,
} from './application/card-pin.use-cases';
import {
  GetCardByRingItemIdUseCase,
  GetCardDetailUseCase,
  ListMyCardsUseCase,
} from './application/card-query.use-cases';
import { MEMORY_CARD_REPOSITORY } from './application/memory-card.repository';
import { PinHasher } from './application/pin-hasher';
import { PrismaMemoryCardRepository } from './infrastructure/prisma-memory-card.repository';
import { MemoryCardGrpcController } from './presentation/memory-card.grpc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MemoryCardGrpcController],
  providers: [
    PinHasher,
    ListMyCardsUseCase,
    GetCardDetailUseCase,
    GetCardByRingItemIdUseCase,
    ProvisionMemoryCardUseCase,
    ActivateCardUseCase,
    SetupPinUseCase,
    ChangePinUseCase,
    ResetPinUseCase,
    { provide: MEMORY_CARD_REPOSITORY, useClass: PrismaMemoryCardRepository },
  ],
  exports: [MEMORY_CARD_REPOSITORY, PinHasher],
})
export class MemoryCardsModule {}
