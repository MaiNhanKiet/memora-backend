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
  CreateCertifiedGemstoneBodyDto,
  ListGemstoneBatchesQueryDto,
  ReceiveGemstoneBatchBodyDto,
} from '../dto';
import {
  ApiCreateCertifiedGemstoneDocs,
  ApiListGemstoneBatchesDocs,
  ApiReceiveGemstoneBatchDocs,
} from '../docs/admin-gemstone.swagger';
import {
  toCreateCertifiedGemstoneGrpcRequest,
  toListGemstoneBatchesGrpcRequest,
  toReceiveGemstoneBatchGrpcRequest,
} from '../mappers/gemstone-http.mapper';

@ApiTags('commerce-admin-inventory')
@Controller('admin/inventory')
@Roles('MANAGER', 'ADMIN')
export class AdminGemstoneController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-003] GET /api/v1/admin/inventory/gemstone-batches
  // ---------------------------------------------------------------------------
  @Get('gemstone-batches')
  @HttpCode(HttpStatus.OK)
  @ApiListGemstoneBatchesDocs()
  async listGemstoneBatches(@Query() query: ListGemstoneBatchesQueryDto) {
    return this.inventoryClient.listGemstoneBatches(
      toListGemstoneBatchesGrpcRequest(query),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-004] POST /api/v1/admin/inventory/gemstone-batches/receipts
  // ---------------------------------------------------------------------------
  @Post('gemstone-batches/receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiReceiveGemstoneBatchDocs()
  async receiveGemstoneBatch(
    @Body() body: ReceiveGemstoneBatchBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.inventoryClient.receiveGemstoneBatch(
      toReceiveGemstoneBatchGrpcRequest(body, actor?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-006] POST /api/v1/admin/inventory/certified-gemstones
  // ---------------------------------------------------------------------------
  @Post('certified-gemstones')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCertifiedGemstoneDocs()
  async createCertifiedGemstone(
    @Body() body: CreateCertifiedGemstoneBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.inventoryClient.createCertifiedGemstone(
      toCreateCertifiedGemstoneGrpcRequest(body, actor?.userId),
    );
  }
}
