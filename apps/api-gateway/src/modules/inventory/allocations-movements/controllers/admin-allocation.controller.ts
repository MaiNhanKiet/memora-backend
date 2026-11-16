import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { InventoryGrpcClient } from '../../clients/inventory-grpc.client';
import {
  AllocateInventoryBodyDto,
  HoldInventoryBodyDto,
  ReleaseInventoryBodyDto,
} from '../dto';
import {
  ApiAllocateInventoryDocs,
  ApiConsumeInventoryDocs,
  ApiHoldInventoryDocs,
  ApiReleaseInventoryDocs,
  ApiReserveInventoryDocs,
} from '../docs/admin-allocation.swagger';
import {
  toAllocateInventoryGrpcRequest,
  toConsumeInventoryGrpcRequest,
  toHoldInventoryGrpcRequest,
  toReleaseInventoryGrpcRequest,
  toReserveInventoryGrpcRequest,
} from '../mappers/allocation-movement-http.mapper';

@ApiTags('commerce-admin-inventory')
@Controller('admin/inventory/allocations')
@Roles('MANAGER', 'ADMIN')
export class AdminAllocationController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-007] POST /api/v1/admin/inventory/allocations/hold
  // ---------------------------------------------------------------------------
  @Post('hold')
  @HttpCode(HttpStatus.CREATED)
  @ApiHoldInventoryDocs()
  async holdInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() body: HoldInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.holdInventory(
      toHoldInventoryGrpcRequest(actor, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-008] POST /api/v1/admin/inventory/allocations/:allocationId/reserve
  // ---------------------------------------------------------------------------
  @Post(':allocationId/reserve')
  @HttpCode(HttpStatus.OK)
  @ApiReserveInventoryDocs()
  async reserveInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.reserveInventory(
      toReserveInventoryGrpcRequest(actor, allocationId),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-009] POST /api/v1/admin/inventory/allocations/:allocationId/allocate
  // ---------------------------------------------------------------------------
  @Post(':allocationId/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiAllocateInventoryDocs()
  async allocateInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
    @Body() body: AllocateInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.allocateInventory(
      toAllocateInventoryGrpcRequest(actor, allocationId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-010] POST /api/v1/admin/inventory/allocations/:allocationId/consume
  // ---------------------------------------------------------------------------
  @Post(':allocationId/consume')
  @HttpCode(HttpStatus.OK)
  @ApiConsumeInventoryDocs()
  async consumeInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.consumeInventory(
      toConsumeInventoryGrpcRequest(actor, allocationId),
    );
  }

  // ---------------------------------------------------------------------------
  // [INVEN-011] POST /api/v1/admin/inventory/allocations/:allocationId/release
  // ---------------------------------------------------------------------------
  @Post(':allocationId/release')
  @HttpCode(HttpStatus.OK)
  @ApiReleaseInventoryDocs()
  async releaseInventory(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('allocationId', ParseUUIDPipe) allocationId: string,
    @Body() body: ReleaseInventoryBodyDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.inventoryClient.releaseInventory(
      toReleaseInventoryGrpcRequest(actor, allocationId, body),
    );
  }
}
