import { Module } from '@nestjs/common';
import { EstimatePriceUseCase } from './application/estimate-price.use-case';
import {
  CreatePriceItemUseCase,
  ListPriceItemsUseCase,
} from './application/price-item.use-cases';
import {
  ApprovePriceVersionUseCase,
  CreatePriceVersionUseCase,
  ListPriceVersionsUseCase,
  RejectPriceVersionUseCase,
} from './application/price-version.use-cases';
import {
  ActivatePricingRuleUseCase,
  CreatePricingRuleUseCase,
  ListPricingRulesUseCase,
} from './application/pricing-rule.use-cases';
import { PRICING_REPOSITORY } from './application/pricing.repository';
import { PrismaPricingRepository } from './infrastructure/prisma-pricing.repository';
import { PricingGrpcController } from './presentation/pricing.grpc.controller';

@Module({
  controllers: [PricingGrpcController],
  providers: [
    EstimatePriceUseCase,
    ListPriceItemsUseCase,
    CreatePriceItemUseCase,
    ListPriceVersionsUseCase,
    CreatePriceVersionUseCase,
    ApprovePriceVersionUseCase,
    RejectPriceVersionUseCase,
    ListPricingRulesUseCase,
    CreatePricingRuleUseCase,
    ActivatePricingRuleUseCase,
    { provide: PRICING_REPOSITORY, useClass: PrismaPricingRepository },
  ],
  exports: [EstimatePriceUseCase, PRICING_REPOSITORY],
})
export class PricingCoreModule {}
