import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { domainGrpcClientOptions } from '../../common/grpc/domain-grpc';
import { PricingEstimateController } from './estimates/controllers/pricing-estimate.controller';
import { AdminPriceItemController } from './price-items/controllers/admin-price-item.controller';
import { AdminPricingRuleController } from './pricing-rules/controllers/admin-pricing-rule.controller';
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
  controllers: [
    PricingEstimateController,
    AdminPriceItemController,
    AdminPricingRuleController,
  ],
  providers: [PricingGrpcClient],
  exports: [PricingGrpcClient],
})
export class PricingModule {}
