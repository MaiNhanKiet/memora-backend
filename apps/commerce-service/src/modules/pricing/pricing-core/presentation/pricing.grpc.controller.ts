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
import { PricingService } from '../application/pricing.service';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class PricingGrpcController implements PricingServiceHandler {
  constructor(private readonly pricingService: PricingService) {}

  @GrpcMethod('PricingService', 'EstimatePrice')
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    return this.pricingService.estimatePrice(request);
  }

  @GrpcMethod('PricingService', 'ListPriceItems')
  listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse> {
    return this.pricingService.listPriceItems(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceItem')
  createPriceItem(request: CreatePriceItemRequest): Promise<PriceItemResponse> {
    return this.pricingService.createPriceItem(request);
  }

  @GrpcMethod('PricingService', 'ListPriceVersions')
  listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    return this.pricingService.listPriceVersions(request);
  }

  @GrpcMethod('PricingService', 'CreatePriceVersion')
  createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.pricingService.createPriceVersion(request);
  }

  @GrpcMethod('PricingService', 'ApprovePriceVersion')
  approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.pricingService.approvePriceVersion(request);
  }

  @GrpcMethod('PricingService', 'RejectPriceVersion')
  rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.pricingService.rejectPriceVersion(request);
  }

  @GrpcMethod('PricingService', 'ListPricingRules')
  listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    return this.pricingService.listPricingRules(request);
  }

  @GrpcMethod('PricingService', 'CreatePricingRule')
  createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.pricingService.createPricingRule(request);
  }

  @GrpcMethod('PricingService', 'ActivatePricingRule')
  activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.pricingService.activatePricingRule(request);
  }
}
