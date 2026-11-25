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
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';
import { EstimatePriceUseCase } from '../application/estimate-price.use-case';
import {
  CreatePriceItemUseCase,
  ListPriceItemsUseCase,
} from '../application/price-item.use-cases';
import {
  ApprovePriceVersionUseCase,
  CreatePriceVersionUseCase,
  ListPriceVersionsUseCase,
  RejectPriceVersionUseCase,
} from '../application/price-version.use-cases';
import {
  ActivatePricingRuleUseCase,
  CreatePricingRuleUseCase,
  ListPricingRulesUseCase,
} from '../application/pricing-rule.use-cases';

/** Thin gRPC adapter. Pricing calculations and validation live in the use cases. */
@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class PricingGrpcController implements PricingServiceHandler {
  constructor(
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
    private readonly listPriceItemsUseCase: ListPriceItemsUseCase,
    private readonly createPriceItemUseCase: CreatePriceItemUseCase,
    private readonly listPriceVersionsUseCase: ListPriceVersionsUseCase,
    private readonly createPriceVersionUseCase: CreatePriceVersionUseCase,
    private readonly approvePriceVersionUseCase: ApprovePriceVersionUseCase,
    private readonly rejectPriceVersionUseCase: RejectPriceVersionUseCase,
    private readonly listPricingRulesUseCase: ListPricingRulesUseCase,
    private readonly createPricingRuleUseCase: CreatePricingRuleUseCase,
    private readonly activatePricingRuleUseCase: ActivatePricingRuleUseCase,
  ) {}

  @GrpcMethod('PricingService', 'EstimatePrice')
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    return this.estimatePriceUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ListPriceItems')
  listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse> {
    return this.listPriceItemsUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceItem')
  createPriceItem(request: CreatePriceItemRequest): Promise<PriceItemResponse> {
    return this.createPriceItemUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ListPriceVersions')
  listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    return this.listPriceVersionsUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceVersion')
  createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.createPriceVersionUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ApprovePriceVersion')
  approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.approvePriceVersionUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'RejectPriceVersion')
  rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.rejectPriceVersionUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ListPricingRules')
  listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    return this.listPricingRulesUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'CreatePricingRule')
  createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.createPricingRuleUseCase.execute(request);
  }

  @GrpcMethod('PricingService', 'ActivatePricingRule')
  activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.activatePricingRuleUseCase.execute(request);
  }
}
