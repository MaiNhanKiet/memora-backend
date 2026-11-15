import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { PricingController } from './controllers/pricing.controller';
import { AdminPricingController } from './controllers/admin-pricing.controller';
import {
  COMMERCE_PRICING_GRPC_CLIENT,
  PricingGrpcClient,
} from './clients/pricing-grpc.client';

@Module({
  imports: [
    ClientsModule.registerAsync([
      domainGrpcClientOptions({
        name: COMMERCE_PRICING_GRPC_CLIENT,
        urlConfigKey: 'apiGateway.commerceGrpcUrl',
        protoPackage: 'memora.commerce.v1',
        protoFile: 'commerce/v1/pricing.proto',
      }),
    ]),
  ],
  controllers: [PricingController, AdminPricingController],
  providers: [PricingGrpcClient],
  exports: [PricingGrpcClient],
})
export class PricingModule {}
