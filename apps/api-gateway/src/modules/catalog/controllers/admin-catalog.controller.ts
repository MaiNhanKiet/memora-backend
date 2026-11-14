import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CatalogGrpcClient } from '../clients/catalog-grpc.client';
import {
  CreateGemstoneOptionBodyDto,
  CreateMaterialBodyDto,
  CreateTemplateBodyDto,
  CreateVariantBodyDto,
  UpdateCompatibilitiesBodyDto,
  UpdateMaterialBodyDto,
  UpdateResizePoliciesBodyDto,
  UpdateTemplateBodyDto,
  UpdateVariantBodyDto,
} from '../dto/request/admin-catalog.dto';
import {
  ApiArchiveTemplateDocs,
  ApiCreateGemstoneOptionDocs,
  ApiCreateMaterialDocs,
  ApiCreateTemplateDocs,
  ApiCreateVariantDocs,
  ApiPublishTemplateDocs,
  ApiUpdateCompatibilitiesDocs,
  ApiUpdateMaterialDocs,
  ApiUpdateResizePoliciesDocs,
  ApiUpdateTemplateDocs,
  ApiUpdateVariantDocs,
} from '../docs/admin-catalog.swagger';

@ApiTags('Admin Catalog')
@Controller('admin/catalog')
export class AdminCatalogController {
  constructor(private readonly catalogClient: CatalogGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [CATAL-005] POST /api/v1/admin/catalog/templates
  // ---------------------------------------------------------------------------
  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiCreateTemplateDocs()
  async createTemplate(
    @Body() body: CreateTemplateBodyDto,
    @CurrentUser() principal?: AuthenticatedPrincipal,
  ) {
    return this.catalogClient.createTemplate({
      code: body.code,
      name: body.name,
      description: body.description,
      glbAssetKey: body.glbAssetKey,
      stoneLayout: body.stoneLayout,
      designSupportedPersonalizationPackages:
        body.designSupportedPersonalizationPackages,
      gender: body.gender,
      createdByUserId: principal?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-006] PATCH /api/v1/admin/catalog/templates/:templateId
  // ---------------------------------------------------------------------------
  @Patch('templates/:templateId')
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiUpdateTemplateDocs()
  async updateTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() body: UpdateTemplateBodyDto,
  ) {
    return this.catalogClient.updateTemplate({
      templateId,
      name: body.name,
      description: body.description,
      glbAssetKey: body.glbAssetKey,
      stoneLayout: body.stoneLayout,
      designSupportedPersonalizationPackages:
        body.designSupportedPersonalizationPackages,
      gender: body.gender,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-007] POST /api/v1/admin/catalog/templates/:templateId/publish
  // ---------------------------------------------------------------------------
  @Post('templates/:templateId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiPublishTemplateDocs()
  async publishTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.publishTemplate({ templateId });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-008] POST /api/v1/admin/catalog/templates/:templateId/archive
  // ---------------------------------------------------------------------------
  @Post('templates/:templateId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiArchiveTemplateDocs()
  async archiveTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.archiveTemplate({ templateId });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-010] POST /api/v1/admin/catalog/materials
  // ---------------------------------------------------------------------------
  @Post('materials')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiCreateMaterialDocs()
  async createMaterial(@Body() body: CreateMaterialBodyDto) {
    return this.catalogClient.createMaterial({
      code: body.code,
      name: body.name,
      materialFamily: body.materialFamily,
      purityPercent: body.purityPercent,
      color: body.color,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-011] PATCH /api/v1/admin/catalog/materials/:materialId
  // ---------------------------------------------------------------------------
  @Patch('materials/:materialId')
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiUpdateMaterialDocs()
  async updateMaterial(
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() body: UpdateMaterialBodyDto,
  ) {
    return this.catalogClient.updateMaterial({
      materialId,
      name: body.name,
      materialFamily: body.materialFamily,
      purityPercent: body.purityPercent,
      color: body.color,
      status: body.status,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-013] POST /api/v1/admin/catalog/variants
  // ---------------------------------------------------------------------------
  @Post('variants')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiCreateVariantDocs()
  async createVariant(
    @Body() body: CreateVariantBodyDto,
    @CurrentUser() principal?: AuthenticatedPrincipal,
  ) {
    return this.catalogClient.createVariant({
      ringTemplateId: body.ringTemplateId,
      materialId: body.materialId,
      standardSize: body.standardSize,
      maxUpDelta: body.maxUpDelta,
      maxDownDelta: body.maxDownDelta,
      resizeMethod: body.resizeMethod,
      addedMetalAllowed: body.addedMetalAllowed,
      localWallThicknessMm: body.localWallThicknessMm,
      minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
      maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
      createdByUserId: principal?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-014] PATCH /api/v1/admin/catalog/variants/:variantId
  // ---------------------------------------------------------------------------
  @Patch('variants/:variantId')
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiUpdateVariantDocs()
  async updateVariant(
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() body: UpdateVariantBodyDto,
  ) {
    return this.catalogClient.updateVariant({
      variantId,
      standardSize: body.standardSize,
      maxUpDelta: body.maxUpDelta,
      maxDownDelta: body.maxDownDelta,
      resizeMethod: body.resizeMethod,
      addedMetalAllowed: body.addedMetalAllowed,
      localWallThicknessMm: body.localWallThicknessMm,
      minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
      maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
      status: body.status,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-017] POST /api/v1/admin/catalog/gemstone-options
  // ---------------------------------------------------------------------------
  @Post('gemstone-options')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiCreateGemstoneOptionDocs()
  async createGemstoneOption(@Body() body: CreateGemstoneOptionBodyDto) {
    return this.catalogClient.createGemstoneOption({
      code: body.code,
      name: body.name,
      stoneType: body.stoneType,
      shape: body.shape,
      lengthMm: body.lengthMm,
      widthMm: body.widthMm,
      colorGrade: body.colorGrade,
      clarityGrade: body.clarityGrade,
      certifiedRequired: body.certifiedRequired,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-018] PUT /api/v1/admin/catalog/compatibilities
  // ---------------------------------------------------------------------------
  @Put('compatibilities')
  @RequirePermissions(PERMISSIONS.CATALOG_OPTION_MANAGE)
  @ApiUpdateCompatibilitiesDocs()
  async updateCompatibilities(@Body() body: UpdateCompatibilitiesBodyDto) {
    return this.catalogClient.updateCompatibilities({
      templateVariantId: body.templateVariantId,
      gemstoneGroupId: body.gemstoneGroupId,
      gemstoneOptionIds: body.gemstoneOptionIds,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-020] PUT /api/v1/admin/catalog/resize-policies
  // ---------------------------------------------------------------------------
  @Put('resize-policies')
  @RequirePermissions(PERMISSIONS.CATALOG_VARIANT_MANAGE)
  @ApiUpdateResizePoliciesDocs()
  async updateResizePolicies(
    @Param('templateVariantId') templateVariantId: string,
    @Body() body: UpdateResizePoliciesBodyDto,
  ) {
    const res = await this.catalogClient.updateResizePolicies({
      templateVariantId,
      maxUpDelta: body.maxUpDelta,
      maxDownDelta: body.maxDownDelta,
      resizeMethod: body.resizeMethod,
      addedMetalAllowed: body.addedMetalAllowed,
      minRemainingWallThicknessMm: body.minRemainingWallThicknessMm,
      maxSafeEngravingDepthMm: body.maxSafeEngravingDepthMm,
    });
    return res.data;
  }
}
