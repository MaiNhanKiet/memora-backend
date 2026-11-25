import { Module } from '@nestjs/common';
import { EstimatePriceUseCase } from './application/estimate-price.use-case';
import { PriceItemUseCases } from './application/price-item.use-cases';
import { PriceVersionUseCases } from './application/price-version.use-cases';
import { PRICING_REPOSITORY } from './application/pricing.repository';
import { PricingRuleUseCases } from './application/pricing-rule.use-cases';
import { PrismaPricingRepository } from './infrastructure/prisma-pricing.repository';
import { PricingGrpcController } from './presentation/pricing.grpc.controller';

@Module({
  controllers: [PricingGrpcController],
  providers: [
    EstimatePriceUseCase,
    PriceItemUseCases,
    PriceVersionUseCases,
    PricingRuleUseCases,
    { provide: PRICING_REPOSITORY, useClass: PrismaPricingRepository },
  ],
  exports: [EstimatePriceUseCase, PRICING_REPOSITORY],
})
export class PricingCoreModule {}
