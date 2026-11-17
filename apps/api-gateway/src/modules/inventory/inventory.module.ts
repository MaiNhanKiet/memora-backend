import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { AdminRingBlankController } from './ring-blanks/controllers/admin-ring-blank.controller';
import { AdminGemstoneController } from './gemstones/controllers/admin-gemstone.controller';
import { GemstoneAvailabilityController } from './gemstones/controllers/gemstone-availability.controller';
import { AdminAllocationController } from './allocations-movements/controllers/admin-allocation.controller';
import { AdminMovementController } from './allocations-movements/controllers/admin-movement.controller';
import {
  COMMERCE_INVENTORY_GRPC_CLIENT,
  InventoryGrpcClient,
} from './clients/inventory-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_INVENTORY_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'memora.commerce.v1',
        protoFile: 'commerce/v1/inventory.proto',
      }),
    ]),
  ],
  controllers: [
    AdminRingBlankController,
    AdminGemstoneController,
    GemstoneAvailabilityController,
    AdminAllocationController,
    AdminMovementController,
  ],
  providers: [InventoryGrpcClient],
  exports: [InventoryGrpcClient],
})
export class InventoryModule {}
