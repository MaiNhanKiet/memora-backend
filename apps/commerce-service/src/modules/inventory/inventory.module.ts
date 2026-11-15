import { Module } from '@nestjs/common';
import { InventoryGrpcController } from '../../presentation/grpc/inventory.grpc.controller';
import { InventoryService } from '../../application/inventory/inventory.service';
import { InventoryMapper } from '../../application/inventory/inventory.mapper';
import { RepositoriesModule } from '../../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [InventoryGrpcController],
  providers: [InventoryService, InventoryMapper],
  exports: [InventoryService, InventoryMapper],
})
export class InventoryModule {}
