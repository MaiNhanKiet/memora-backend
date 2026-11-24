import { Module } from '@nestjs/common';
import { OrderingCoreModule } from './ordering-core/ordering-core.module';

@Module({
  imports: [OrderingCoreModule],
  exports: [OrderingCoreModule],
})
export class OrderingModule {}
