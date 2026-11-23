import { Module } from '@nestjs/common';
import { MemoryCardsModule } from './cards/memory-cards.module';
import { MemoryContentsModule } from './contents/memory-contents.module';
import { MemoryGrantsModule } from './grants/memory-grants.module';

@Module({
  imports: [MemoryCardsModule, MemoryContentsModule, MemoryGrantsModule],
  exports: [MemoryCardsModule, MemoryContentsModule, MemoryGrantsModule],
})
export class MemoryModule {}
