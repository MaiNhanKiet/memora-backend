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
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PricingGrpcClient } from '../../clients/pricing-grpc.client';
import {
  ApprovePriceVersionBodyDto,
  CreatePriceItemBodyDto,
  CreatePriceVersionBodyDto,
  ListPriceItemsQueryDto,
  ListPriceVersionsQueryDto,
  RejectPriceVersionBodyDto,
} from '../dto';
import {
  ApiApprovePriceVersionDocs,
  ApiCreatePriceItemDocs,
  ApiCreatePriceVersionDocs,
  ApiListPriceItemsDocs,
  ApiListPriceVersionsDocs,
  ApiRejectPriceVersionDocs,
} from '../docs/admin-price-item.swagger';
import {
  toApprovePriceVersionGrpcRequest,
  toCreatePriceItemGrpcRequest,
  toCreatePriceVersionGrpcRequest,
  toListPriceItemsGrpcRequest,
  toListPriceVersionsGrpcRequest,
  toRejectPriceVersionGrpcRequest,
} from '../mappers/price-item-http.mapper';

@ApiTags('commerce-admin-pricing')
@Controller('admin/pricing')
@Roles('MANAGER', 'ADMIN')
export class AdminPriceItemController {
  constructor(private readonly pricingClient: PricingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [PRICI-002] GET /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  @Get('items')
  @HttpCode(HttpStatus.OK)
  @ApiListPriceItemsDocs()
  async listPriceItems(@Query() query: ListPriceItemsQueryDto) {
    return this.pricingClient.listPriceItems(
      toListPriceItemsGrpcRequest(query),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-003] POST /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePriceItemDocs()
  async createPriceItem(@Body() body: CreatePriceItemBodyDto) {
    return this.pricingClient.createPriceItem(
      toCreatePriceItemGrpcRequest(body),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-004] GET /api/v1/admin/pricing/versions
  // ---------------------------------------------------------------------------
  @Get('versions')
  @HttpCode(HttpStatus.OK)
  @ApiListPriceVersionsDocs()
  async listPriceVersions(@Query() query: ListPriceVersionsQueryDto) {
    return this.pricingClient.listPriceVersions(
      toListPriceVersionsGrpcRequest(query),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-005] POST /api/v1/admin/pricing/versions
  // ---------------------------------------------------------------------------
  @Post('versions')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePriceVersionDocs()
  async createPriceVersion(
    @Body() body: CreatePriceVersionBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.createPriceVersion(
      toCreatePriceVersionGrpcRequest(body, actor?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-006] POST /api/v1/admin/pricing/versions/:versionId/approve
  // ---------------------------------------------------------------------------
  @Post('versions/:versionId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiApprovePriceVersionDocs()
  async approvePriceVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ApprovePriceVersionBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.approvePriceVersion(
      toApprovePriceVersionGrpcRequest(versionId, body, actor?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [PRICI-007] POST /api/v1/admin/pricing/versions/:versionId/reject
  // ---------------------------------------------------------------------------
  @Post('versions/:versionId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectPriceVersionDocs()
  async rejectPriceVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: RejectPriceVersionBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.rejectPriceVersion(
      toRejectPriceVersionGrpcRequest(versionId, body, actor?.userId),
    );
  }
}
