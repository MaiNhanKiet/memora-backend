import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { InventoryGrpcClient } from '../clients/inventory-grpc.client';
import { ListCertifiedGemstoneAvailabilityQueryDto } from '../dto/request/admin-inventory.dto';
import { ApiListCertifiedGemstoneAvailabilityDocs } from '../docs/admin-inventory.swagger';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
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
    return this.inventoryClient.listCertifiedGemstoneAvailability({
      gemstoneOptionId: query.gemstoneOptionId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
