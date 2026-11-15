import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../common/grpc/verified-actor';
import { InventoryGrpcClient } from '../clients/inventory-grpc.client';
import {
  AdjustInventoryBodyDto,
  AllocateInventoryBodyDto,
  CreateCertifiedGemstoneBodyDto,
  HoldInventoryBodyDto,
  ListGemstoneBatchesQueryDto,
  ListInventoryMovementsQueryDto,
  ListRingBlankStocksQueryDto,
  ReceiveGemstoneBatchBodyDto,
  ReceiveRingBlankStockBodyDto,
  ReleaseInventoryBodyDto,
} from '../dto/request/admin-inventory.dto';
import {
  ApiAdjustInventoryDocs,
  ApiAllocateInventoryDocs,
  ApiConsumeInventoryDocs,
  ApiCreateCertifiedGemstoneDocs,
  ApiHoldInventoryDocs,
  ApiListGemstoneBatchesDocs,
  ApiListInventoryMovementsDocs,
  ApiListRingBlankStocksDocs,
  ApiReceiveGemstoneBatchDocs,
  ApiReceiveRingBlankStockDocs,
  ApiReleaseInventoryDocs,
  ApiReserveInventoryDocs,
} from '../docs/admin-inventory.swagger';

@ApiTags('Admin Inventory')
@Controller('admin/inventory')
@Roles('MANAGER', 'ADMIN')
export class AdminInventoryController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-001] GET /api/v1/admin/inventory/ring-blanks
  // ---------------------------------------------------------------------------
  @Get('ring-blanks')
  @HttpCode(HttpStatus.OK)
  @ApiListRingBlankStocksDocs()
  async listRingBlankStocks(@Query() query: ListRingBlankStocksQueryDto) {
    return this.inventoryClient.listRingBlankStocks({
      templateVariantId: query.templateVariantId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-002] POST /api/v1/admin/inventory/ring-blanks/receipts
  // ---------------------------------------------------------------------------
  @Post('ring-blanks/receipts')
  @HttpCode(HttpStatus.CREATED)
  @ApiReceiveRingBlankStockDocs()
  async receiveRingBlankStock(
    @Body() body: ReceiveRingBlankStockBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.inventoryClient.receiveRingBlankStock({
      templateVariantId: body.templateVariantId,
      lotCode: body.lotCode,
      supplierRef: body.supplierRef,
      quantity: body.quantity,
      unitCost: body.unitCost,
      locationCode: body.locationCode,
      receivedAt: body.receivedAt,
      performedByUserId: actor?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-003] GET /api/v1/admin/inventory/gemstone-batches
  // ---------------------------------------------------------------------------
  @Get('gemstone-batches')
  @HttpCode(HttpStatus.OK)
  @ApiListGemstoneBatchesDocs()
  async listGemstoneBatches(@Query() query: ListGemstoneBatchesQueryDto) {
    return this.inventoryClient.listGemstoneBatches({
      gemstoneOptionId: query.gemstoneOptionId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
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
    return this.inventoryClient.receiveGemstoneBatch({
      gemstoneOptionId: body.gemstoneOptionId,
      lotCode: body.lotCode,
      supplierRef: body.supplierRef,
      quantity: body.quantity,
      unitCost: body.unitCost,
      locationCode: body.locationCode,
      receivedAt: body.receivedAt,
      performedByUserId: actor?.userId,
    });
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
    return this.inventoryClient.createCertifiedGemstone({
      internalCode: body.internalCode,
      gemstoneOptionId: body.gemstoneOptionId,
      certificateProvider: body.certificateProvider,
      certificateNumber: body.certificateNumber,
      certificateUrl: body.certificateUrl,
      certificateMetadataJson: body.certificateMetadata
        ? JSON.stringify(body.certificateMetadata)
        : undefined,
      purchaseCost: body.purchaseCost,
      locationCode: body.locationCode,
      performedByUserId: actor?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-012] GET /api/v1/admin/inventory/movements
  // ---------------------------------------------------------------------------
  @Get('movements')
  @HttpCode(HttpStatus.OK)
  @ApiListInventoryMovementsDocs()
  async listInventoryMovements(@Query() query: ListInventoryMovementsQueryDto) {
    return this.inventoryClient.listInventoryMovements({
      stockLotId: query.stockLotId,
      certifiedGemstoneId: query.certifiedGemstoneId,
      movementType: query.movementType,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-013] POST /api/v1/admin/inventory/adjustments
  // ---------------------------------------------------------------------------
  @Post('adjustments')
  @HttpCode(HttpStatus.OK)
  @ApiAdjustInventoryDocs()
  async adjustInventory(
    @Body() body: AdjustInventoryBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.inventoryClient.adjustInventory({
      stockLotId: body.stockLotId,
      adjustedQuantity: body.adjustedQuantity,
      reason: body.reason,
      metadataJson: body.metadata ? JSON.stringify(body.metadata) : undefined,
      performedByUserId: actor?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-007] POST /api/v1/admin/inventory/allocations/hold
  // ---------------------------------------------------------------------------
  @Post('allocations/hold')
  @HttpCode(HttpStatus.CREATED)
  @ApiHoldInventoryDocs()
  async holdInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: HoldInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.holdInventory({
      actor,
      ringItemId: body.ringItemId,
      stockLotId: body.stockLotId,
      certifiedGemstoneId: body.certifiedGemstoneId,
      quantity: body.quantity,
      ttlMinutes: body.ttlMinutes,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-008] POST /api/v1/admin/inventory/allocations/:allocationId/reserve
  // ---------------------------------------------------------------------------
  @Post('allocations/:allocationId/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiReserveInventoryDocs()
  async reserveInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.reserveInventory({
      actor,
      allocationId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-009] POST /api/v1/admin/inventory/allocations/:allocationId/allocate
  // ---------------------------------------------------------------------------
  @Post('allocations/:allocationId/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiAllocateInventoryDocs()
  async allocateInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
    @Body() body: AllocateInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.allocateInventory({
      actor,
      allocationId,
      productionAttemptId: body.productionAttemptId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-010] POST /api/v1/admin/inventory/allocations/:allocationId/consume
  // ---------------------------------------------------------------------------
  @Post('allocations/:allocationId/consume')
  @HttpCode(HttpStatus.OK)
  @ApiConsumeInventoryDocs()
  async consumeInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.consumeInventory({
      actor,
      allocationId,
    });
  }

  // ---------------------------------------------------------------------------
  // [INVEN-011] POST /api/v1/admin/inventory/allocations/:allocationId/release
  // ---------------------------------------------------------------------------
  @Post('allocations/:allocationId/release')
  @HttpCode(HttpStatus.OK)
  @ApiReleaseInventoryDocs()
  async releaseInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
    @Body() body: ReleaseInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.releaseInventory({
      actor,
      allocationId,
      reason: body.reason,
    });
  }
}
