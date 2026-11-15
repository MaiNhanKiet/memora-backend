import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { CartController } from './controllers/cart.controller';
import { DesignDraftController } from './controllers/design-draft.controller';
import {
  COMMERCE_CART_GRPC_CLIENT,
  DesignGrpcClient,
} from './clients/design-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_CART_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'memora.commerce.v1',
        protoFile: 'commerce/v1/cart.proto',
      }),
    ]),
  ],
  controllers: [CartController, DesignDraftController],
  providers: [DesignGrpcClient],
  exports: [DesignGrpcClient],
})
export class DesignModule {}
