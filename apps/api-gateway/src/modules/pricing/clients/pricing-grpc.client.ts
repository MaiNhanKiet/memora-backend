import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
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
  PricingServiceClient,
  RejectPriceVersionRequest,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_PRICING_GRPC_CLIENT = 'COMMERCE_PRICING_GRPC_CLIENT';

@Injectable()
export class PricingGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private pricingService!: PricingServiceClient;

  constructor(
    @Inject(COMMERCE_PRICING_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret', {
      optional: true,
    });
  }

  onModuleInit(): void {
    this.pricingService =
      this.grpcClient.getService<PricingServiceClient>('PricingService');
  }

  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    return this.unary((metadata) =>
      this.pricingService.estimatePrice(request, metadata),
    );
  }

  listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse> {
    return this.unary((metadata) =>
      this.pricingService.listPriceItems(request, metadata),
    );
  }

  createPriceItem(request: CreatePriceItemRequest): Promise<PriceItemResponse> {
    return this.unary((metadata) =>
      this.pricingService.createPriceItem(request, metadata),
    );
  }

  listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse> {
    return this.unary((metadata) =>
      this.pricingService.listPriceVersions(request, metadata),
    );
  }

  createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.unary((metadata) =>
      this.pricingService.createPriceVersion(request, metadata),
    );
  }

  approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.unary((metadata) =>
      this.pricingService.approvePriceVersion(request, metadata),
    );
  }

  rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse> {
    return this.unary((metadata) =>
      this.pricingService.rejectPriceVersion(request, metadata),
    );
  }

  listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    return this.unary((metadata) =>
      this.pricingService.listPricingRules(request, metadata),
    );
  }

  createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.unary((metadata) =>
      this.pricingService.createPricingRule(request, metadata),
    );
  }

  activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    return this.unary((metadata) =>
      this.pricingService.activatePricingRule(request, metadata),
    );
  }
}
