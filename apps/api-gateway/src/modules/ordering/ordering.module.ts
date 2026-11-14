import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { AdminOrdersController } from './controllers/admin-orders.controller';
import { OrdersController } from './controllers/orders.controller';
import {
  COMMERCE_ORDERING_GRPC_CLIENT,
  OrderingGrpcClient,
} from './clients/ordering-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_ORDERING_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'commerce.v1',
        protoFile: 'commerce/v1/ordering.proto',
      }),
    ]),
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrderingGrpcClient],
  exports: [OrderingGrpcClient],
})
export class OrderingModule {}
