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
import { PricingGrpcClient } from '../clients/pricing-grpc.client';
import {
  ApprovePriceVersionBodyDto,
  CreatePriceItemBodyDto,
  CreatePriceVersionBodyDto,
  CreatePricingRuleBodyDto,
  ListPriceItemsQueryDto,
  ListPriceVersionsQueryDto,
  ListPricingRulesQueryDto,
  RejectPriceVersionBodyDto,
} from '../dto/request/admin-pricing.dto';
import {
  ApiActivatePricingRuleDocs,
  ApiApprovePriceVersionDocs,
  ApiCreatePriceItemDocs,
  ApiCreatePriceVersionDocs,
  ApiCreatePricingRuleDocs,
  ApiListPriceItemsDocs,
  ApiListPriceVersionsDocs,
  ApiListPricingRulesDocs,
  ApiRejectPriceVersionDocs,
} from '../docs/admin-pricing.swagger';

@ApiTags('commerce-admin-pricing')
@Controller('admin/pricing')
@Roles('MANAGER', 'ADMIN')
export class AdminPricingController {
  constructor(private readonly pricingClient: PricingGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [PRICI-002] GET /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  @Get('items')
  @HttpCode(HttpStatus.OK)
  @ApiListPriceItemsDocs()
  async listPriceItems(@Query() query: ListPriceItemsQueryDto) {
    return this.pricingClient.listPriceItems({
      priceType: query.priceType,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ---------------------------------------------------------------------------
  // [PRICI-003] POST /api/v1/admin/pricing/items
  // ---------------------------------------------------------------------------
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePriceItemDocs()
  async createPriceItem(@Body() body: CreatePriceItemBodyDto) {
    return this.pricingClient.createPriceItem({
      priceType: body.priceType,
      code: body.code,
      templateVariantId: body.templateVariantId,
      gemstoneOptionId: body.gemstoneOptionId,
      certifiedGemstoneId: body.certifiedGemstoneId,
      personalizationPackage: body.personalizationPackage,
      status: body.status,
    });
  }

  // ---------------------------------------------------------------------------
  // [PRICI-004] GET /api/v1/admin/pricing/versions
  // ---------------------------------------------------------------------------
  @Get('versions')
  @HttpCode(HttpStatus.OK)
  @ApiListPriceVersionsDocs()
  async listPriceVersions(@Query() query: ListPriceVersionsQueryDto) {
    return this.pricingClient.listPriceVersions({
      priceItemId: query.priceItemId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
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
    return this.pricingClient.createPriceVersion({
      priceItemId: body.priceItemId,
      amount: body.amount,
      currency: body.currency,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      sourceType: body.sourceType,
      marketSnapshotJson: body.marketSnapshot
        ? JSON.stringify(body.marketSnapshot)
        : undefined,
      createdByUserId: actor?.userId,
    });
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
    return this.pricingClient.approvePriceVersion({
      versionId,
      reviewNote: body.reviewNote,
      reviewedByUserId: actor?.userId,
    });
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
    return this.pricingClient.rejectPriceVersion({
      versionId,
      reviewNote: body.reviewNote,
      reviewedByUserId: actor?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [PRICI-008] GET /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  @Get('rules')
  @HttpCode(HttpStatus.OK)
  @ApiListPricingRulesDocs()
  async listPricingRules(@Query() query: ListPricingRulesQueryDto) {
    return this.pricingClient.listPricingRules({
      ruleType: query.ruleType,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ---------------------------------------------------------------------------
  // [PRICI-009] POST /api/v1/admin/pricing/rules
  // ---------------------------------------------------------------------------
  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePricingRuleDocs()
  async createPricingRule(
    @Body() body: CreatePricingRuleBodyDto,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.createPricingRule({
      ruleType: body.ruleType,
      code: body.code,
      name: body.name,
      templateVariantId: body.templateVariantId,
      resizeDirection: body.resizeDirection,
      deliveryZoneCode: body.deliveryZoneCode,
      cancellationStage: body.cancellationStage,
      redeliveryReason: body.redeliveryReason,
      configJson: body.config ? JSON.stringify(body.config) : undefined,
      effectiveFrom: body.effectiveFrom,
      effectiveTo: body.effectiveTo,
      createdByUserId: actor?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [PRICI-010] POST /api/v1/admin/pricing/rules/:ruleId/activate
  // ---------------------------------------------------------------------------
  @Post('rules/:ruleId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiActivatePricingRuleDocs()
  async activatePricingRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() actor?: AuthenticatedPrincipal,
  ) {
    return this.pricingClient.activatePricingRule({
      ruleId,
      approvedByUserId: actor?.userId,
    });
  }
}
