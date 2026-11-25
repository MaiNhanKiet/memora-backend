import { Module } from '@nestjs/common';
import { AllocationUseCases } from './application/allocation.use-cases';
import { CertifiedGemstoneUseCases } from './application/certified-gemstone.use-cases';
import { INVENTORY_REPOSITORY } from './application/inventory.repository';
import { StockLotUseCases } from './application/stock-lot.use-cases';
import { PrismaInventoryRepository } from './infrastructure/prisma-inventory.repository';
import { InventoryGrpcController } from './presentation/inventory.grpc.controller';

@Module({
  controllers: [InventoryGrpcController],
  providers: [
    StockLotUseCases,
    CertifiedGemstoneUseCases,
    AllocationUseCases,
    { provide: INVENTORY_REPOSITORY, useClass: PrismaInventoryRepository },
  ],
  exports: [INVENTORY_REPOSITORY],
})
export class InventoryCoreModule {}
