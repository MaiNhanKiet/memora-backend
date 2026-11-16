import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { PricingGrpcClient } from '../clients/pricing-grpc.client';
import { EstimatePriceBodyDto } from '../dto/estimate-price.dto';
import { ApiEstimatePriceDocs } from '../docs/pricing.swagger';

@ApiTags('commerce-pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingClient: PricingGrpcClient) {}

  @Public()
  @Post('estimates')
  @HttpCode(HttpStatus.OK)
  @ApiEstimatePriceDocs()
  async estimatePrice(@Body() body: EstimatePriceBodyDto) {
    return this.pricingClient.estimatePrice({
      templateVariantId: body.templateVariantId,
      targetSize: body.targetSize,
      gemstoneOptionIds: body.gemstoneOptionIds ?? [],
      personalizationPackage: body.personalizationPackage ?? 'NONE',
    });
  }
}
