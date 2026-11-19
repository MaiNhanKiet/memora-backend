import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { InventoryGrpcClient } from '../../clients/inventory-grpc.client';
import { ListCertifiedGemstoneAvailabilityQueryDto } from '../dto';
import { ApiListCertifiedGemstoneAvailabilityDocs } from '../docs/gemstone-availability.swagger';
import { toListCertifiedGemstoneAvailabilityGrpcRequest } from '../mappers/gemstone-http.mapper';

@ApiTags('commerce-inventory')
@Controller('inventory')
export class GemstoneAvailabilityController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-005] GET /api/v1/inventory/certified-gemstones/availability
  // ---------------------------------------------------------------------------
  @Get('certified-gemstones/availability')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiListCertifiedGemstoneAvailabilityDocs()
  async listCertifiedGemstoneAvailability(
    @Query() query: ListCertifiedGemstoneAvailabilityQueryDto,
  ) {
    return this.inventoryClient.listCertifiedGemstoneAvailability(
      toListCertifiedGemstoneAvailabilityGrpcRequest(query),
    );
  }
}
