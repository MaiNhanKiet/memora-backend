import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../persistence/prisma/prisma.module';
import { MemoryCardsModule } from '../cards/memory-cards.module';
import { MemoryContentsModule } from '../contents/memory-contents.module';
import { MemoryGrantService } from './application/memory-grant.service';
import { MemoryGrantRepository } from './infrastructure/memory-grant.repository';
import { MemoryGrantGrpcController } from './presentation/memory-grant.grpc.controller';

@Module({
  imports: [PrismaModule, MemoryCardsModule, MemoryContentsModule],
  controllers: [MemoryGrantGrpcController],
  providers: [MemoryGrantRepository, MemoryGrantService],
  exports: [MemoryGrantService, MemoryGrantRepository],
})
export class MemoryGrantsModule {}
