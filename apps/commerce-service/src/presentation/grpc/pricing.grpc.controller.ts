import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  EstimatePriceRequest,
  EstimatePriceResponse,
  PricingServiceHandler,
} from '@app/contracts';
import { PricingService } from '../../application/pricing/pricing.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class PricingGrpcController implements PricingServiceHandler {
  constructor(private readonly pricingService: PricingService) {}

  @GrpcMethod('PricingService', 'EstimatePrice')
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse> {
    return this.pricingService.estimatePrice(request);
  }
}
