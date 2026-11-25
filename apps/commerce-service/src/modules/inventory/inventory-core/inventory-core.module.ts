import { Module } from '@nestjs/common';
import {
  AllocateInventoryUseCase,
  ConsumeInventoryUseCase,
  HoldInventoryUseCase,
  ReleaseInventoryUseCase,
  ReserveInventoryUseCase,
} from './application/allocation.use-cases';
import {
  CreateCertifiedGemstoneUseCase,
  ListCertifiedGemstoneAvailabilityUseCase,
} from './application/certified-gemstone.use-cases';
import { INVENTORY_REPOSITORY } from './application/inventory.repository';
import {
  AdjustInventoryUseCase,
  ListGemstoneBatchesUseCase,
  ListInventoryMovementsUseCase,
  ListRingBlankStocksUseCase,
  ReceiveGemstoneBatchUseCase,
  ReceiveRingBlankStockUseCase,
} from './application/stock-lot.use-cases';
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository';
import { InventoryGrpcController } from './presentation/inventory.grpc.controller';

@Module({
  controllers: [InventoryGrpcController],
  providers: [
    ListRingBlankStocksUseCase,
    ReceiveRingBlankStockUseCase,
    ListGemstoneBatchesUseCase,
    ReceiveGemstoneBatchUseCase,
    ListCertifiedGemstoneAvailabilityUseCase,
    CreateCertifiedGemstoneUseCase,
    ListInventoryMovementsUseCase,
    AdjustInventoryUseCase,
    HoldInventoryUseCase,
    ReserveInventoryUseCase,
    AllocateInventoryUseCase,
    ConsumeInventoryUseCase,
    ReleaseInventoryUseCase,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
  ],
  exports: [INVENTORY_REPOSITORY],
})
export class InventoryCoreModule {}
