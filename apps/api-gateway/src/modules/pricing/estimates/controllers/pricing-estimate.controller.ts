import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { PricingGrpcClient } from '../../clients/pricing-grpc.client';
import { EstimatePriceBodyDto } from '../dto';
import { ApiEstimatePriceDocs } from '../docs/pricing-estimate.swagger';
import { toEstimatePriceGrpcRequest } from '../mappers/pricing-estimate-http.mapper';

@ApiTags('commerce-pricing')
@Controller('pricing')
export class PricingEstimateController {
  constructor(private readonly pricingClient: PricingGrpcClient) {}

  @Public()
  @Post('estimates')
  @HttpCode(HttpStatus.OK)
  @ApiEstimatePriceDocs()
  async estimatePrice(@Body() body: EstimatePriceBodyDto) {
    return this.pricingClient.estimatePrice(
      toEstimatePriceGrpcRequest(body),
    );
  }
}
