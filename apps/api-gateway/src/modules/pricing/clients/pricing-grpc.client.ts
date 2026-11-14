import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  EstimatePriceRequest,
  EstimatePriceResponse,
  PricingServiceClient,
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
    super(configService, 'apiGateway.commerceInternalGrpcSecret');
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
}
