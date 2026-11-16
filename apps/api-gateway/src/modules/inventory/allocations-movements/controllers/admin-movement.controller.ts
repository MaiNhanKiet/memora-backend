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
import { AdjustInventoryBodyDto, ListInventoryMovementsQueryDto } from '../dto';
import {
  ApiAdjustInventoryDocs,
  ApiListInventoryMovementsDocs,
} from '../docs/admin-movement.swagger';
import {
  toAdjustInventoryGrpcRequest,
  toListInventoryMovementsGrpcRequest,
} from '../mappers/allocation-movement-http.mapper';

@ApiTags('commerce-admin-inventory')
@Controller('admin/inventory')
@Roles('MANAGER', 'ADMIN')
export class AdminMovementController {
  constructor(private readonly inventoryClient: InventoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [INVEN-012] GET /api/v1/admin/inventory/movements
  // ---------------------------------------------------------------------------
  @Get('movements')
  @HttpCode(HttpStatus.OK)
  @ApiListInventoryMovementsDocs()
  async listInventoryMovements(@Query() query: ListInventoryMovementsQueryDto) {
    return this.inventoryClient.listInventoryMovements(
      toListInventoryMovementsGrpcRequest(query),
    );
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
    return this.inventoryClient.adjustInventory(
      toAdjustInventoryGrpcRequest(body, actor?.userId),
    );
  }
}
