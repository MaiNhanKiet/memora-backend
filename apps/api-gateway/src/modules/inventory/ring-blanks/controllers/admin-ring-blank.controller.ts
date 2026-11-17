import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { InventoryGrpcClient } from '../../clients/inventory-grpc.client';
import {
  ListRingBlankStocksQueryDto,
  ReceiveRingBlankStockBodyDto,
} from '../dto';
import {
  ApiListRingBlankStocksDocs,
  ApiReceiveRingBlankStockDocs,
} from '../docs/admin-ring-blank.swagger';
import {
  toListRingBlankStocksGrpcRequest,
  toReceiveRingBlankStockGrpcRequest,
} from '../mappers/ring-blank-http.mapper';

@ApiTags('commerce-admin-inventory')
@Controller('admin/inventory/ring-blanks')
@Roles('MANAGER', 'ADMIN')
export class AdminRingBlankController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-001] GET /api/v1/admin/inventory/ring-blanks
  // ---------------------------------------------------------------------------
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListRingBlankStocksDocs()
  async listRingBlankStocks(@Query() query: ListRingBlankStocksQueryDto) {
    return this.inventoryClient.listRingBlankStocks(
      toListRingBlankStocksGrpcRequest(query),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-002] POST /api/v1/admin/inventory/ring-blanks/receipts
  // ---------------------------------------------------------------------------
  @Post('receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiReceiveRingBlankStockDocs()
  async receiveRingBlankStock(
    @Body() body: ReceiveRingBlankStockBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.inventoryClient.receiveRingBlankStock(
      toReceiveRingBlankStockGrpcRequest(body, actor?.userId),
    );
  }
}
