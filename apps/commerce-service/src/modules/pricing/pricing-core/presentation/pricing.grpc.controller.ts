import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  ActivatePricingRuleRequest,
  ApprovePriceVersionRequest,
  CreatePriceItemRequest,
  CreatePriceVersionRequest,
  CreatePricingRuleRequest,
  EstimatePriceRequest,
  EstimatePriceResponse,
  ListPriceItemsRequest,
  ListPriceItemsResponse,
  ListPriceVersionsRequest,
  ListPriceVersionsResponse,
  ListPricingRulesRequest,
  ListPricingRulesResponse,
  PriceItemResponse,
  PriceVersionResponse,
  PricingRuleResponse,
  PricingServiceHandler,
  RejectPriceVersionRequest,
} from '@app/contracts';
import { EstimatePriceUseCase } from '../application/estimate-price.use-case';
import { PriceItemUseCases } from '../application/price-item.use-cases';
import { PriceVersionUseCases } from '../application/price-version.use-cases';
import { PricingRuleUseCases } from '../application/pricing-rule.use-cases';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class PricingGrpcController implements PricingServiceHandler {
  constructor(
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
    private readonly priceItemUseCases: PriceItemUseCases,
    private readonly priceVersionUseCases: PriceVersionUseCases,
    private readonly pricingRuleUseCases: PricingRuleUseCases,
  ) {}

  @GrpcMethod('PricingService', 'EstimatePrice')
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    return this.estimatePriceUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ListPriceItems')
  listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse> {
    return this.priceItemUseCases.listPriceItems(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceItem')
  createPriceItem(request: CreatePriceItemRequest): Promise<PriceItemResponse> {
    return this.priceItemUseCases.createPriceItem(request);
  }

  @GrpcMethod('PricingService', 'ListPriceVersions')
  listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    return this.priceVersionUseCases.listPriceVersions(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceVersion')
  createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.priceVersionUseCases.createPriceVersion(request);
  }

  @GrpcMethod('PricingService', 'ApprovePriceVersion')
  approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.priceVersionUseCases.approvePriceVersion(request);
  }

  @GrpcMethod('PricingService', 'RejectPriceVersion')
  rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.priceVersionUseCases.rejectPriceVersion(request);
  }

  @GrpcMethod('PricingService', 'ListPricingRules')
  listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    return this.pricingRuleUseCases.listPricingRules(request);
  }

  @GrpcMethod('PricingService', 'CreatePricingRule')
  createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.pricingRuleUseCases.createPricingRule(request);
  }

  @GrpcMethod('PricingService', 'ActivatePricingRule')
  activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.pricingRuleUseCases.activatePricingRule(request);
  }
}
