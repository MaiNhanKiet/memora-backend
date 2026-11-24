import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { PinHasher } from './application/pin-hasher';
import { MemoryCardService } from './application/memory-card.service';
import { MemoryCardRepository } from './infrastructure/memory-card.repository';
import { MemoryCardGrpcController } from './presentation/memory-card.grpc.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MemoryCardGrpcController],
  providers: [PinHasher, MemoryCardRepository, MemoryCardService],
  exports: [MemoryCardService, MemoryCardRepository, PinHasher],
})
export class MemoryCardsModule {}
