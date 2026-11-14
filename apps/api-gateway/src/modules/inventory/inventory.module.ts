import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { InventoryController } from './controllers/inventory.controller';
import { AdminInventoryController } from './controllers/admin-inventory.controller';
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
        protoPackage: 'commerce.v1',
        protoFile: 'commerce/v1/inventory.proto',
      }),
    ]),
  ],
  controllers: [InventoryController, AdminInventoryController],
  providers: [InventoryGrpcClient],
  exports: [InventoryGrpcClient],
})
export class InventoryModule {}
