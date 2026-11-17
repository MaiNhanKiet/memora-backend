import { Module } from '@nestjs/common';
import { InventoryGrpcController } from './presentation/inventory.grpc.controller';
import { InventoryService } from './application/inventory.service';
import { InventoryMapper } from './application/inventory.mapper';
import { InventoryRepository } from './infrastructure/inventory.repository';

@Module({
  controllers: [InventoryGrpcController],
  providers: [InventoryService, InventoryMapper, InventoryRepository],
  exports: [InventoryService, InventoryMapper, InventoryRepository],
})
export class InventoryCoreModule {}
