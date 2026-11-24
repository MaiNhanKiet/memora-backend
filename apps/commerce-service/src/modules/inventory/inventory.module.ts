import { Module } from '@nestjs/common';
import { InventoryCoreModule } from './inventory-core/inventory-core.module';

@Module({
  imports: [InventoryCoreModule],
  exports: [InventoryCoreModule],
})
export class InventoryModule {}
