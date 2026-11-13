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
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { CatalogGrpcClient } from '../clients/catalog-grpc.client';
import { ListTemplatesQueryDto } from '../dto/request/list-templates.query.dto';
import { ListGemstoneOptionsQueryDto } from '../dto/request/list-gemstone-options.query.dto';
import { ListVariantsQueryDto } from '../dto/request/list-variants.query.dto';
import { ValidateConfigurationBodyDto } from '../dto/request/validate-configuration.body.dto';
import {
  ApiGetTemplate3DAssetsDocs,
  ApiGetTemplateByIdDocs,
  ApiGetTemplateConfigurationOptionsDocs,
  ApiListGemstoneOptionsDocs,
  ApiListGemstoneSlotsDocs,
  ApiListMaterialsDocs,
  ApiListTemplatesDocs,
  ApiListTemplateVariantsDocs,
  ApiValidateConfigurationDocs,
} from '../docs/catalog.swagger';

@ApiTags('catalog')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogClient: CatalogGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [CATAL-001] GET /api/v1/catalog/templates
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates')
  @ApiListTemplatesDocs()
  async listTemplates(@Query() query: ListTemplatesQueryDto) {
    const res = await this.catalogClient.listTemplates({
      pagination: {
        page: query.page,
        limit: query.limit,
      },
      gender: query.gender,
      search: query.search,
    });
    return {
      data: res.data,
      meta: res.pagination,
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-009] GET /api/v1/catalog/materials (Placed before :templateId)
  // ---------------------------------------------------------------------------
  @Public()
  @Get('materials')
  @ApiListMaterialsDocs()
  async listMaterials() {
    const res = await this.catalogClient.listMaterials({ status: 'ACTIVE' });
    return res.data;
  }

  // ---------------------------------------------------------------------------
  // [CATAL-015] GET /api/v1/catalog/gemstone-options (Placed before :templateId)
  // ---------------------------------------------------------------------------
  @Public()
  @Get('gemstone-options')
  @ApiListGemstoneOptionsDocs()
  async listGemstoneOptions(@Query() query: ListGemstoneOptionsQueryDto) {
    const res = await this.catalogClient.listGemstoneOptions({
      pagination: {
        page: query.page,
        limit: query.limit,
      },
      stoneType: query.stoneType,
      shape: query.shape,
      isCertified: query.isCertified,
    });
    return {
      data: res.data,
      meta: res.pagination,
    };
  }

  // ---------------------------------------------------------------------------
  // [CATAL-021] POST /api/v1/catalog/configurations/validate
  // ---------------------------------------------------------------------------
  @Public()
  @Post('configurations/validate')
  @HttpCode(HttpStatus.OK)
  @ApiValidateConfigurationDocs()
  async validateConfiguration(@Body() body: ValidateConfigurationBodyDto) {
    const res = await this.catalogClient.validateConfiguration({
      templateId: body.templateId,
      materialId: body.materialId,
      standardSize: body.standardSize,
      targetSize: body.targetSize,
      gemstoneSelections: body.gemstoneSelections.map((sel) => ({
        slotNumber: sel.slotNumber,
        gemstoneOptionId: sel.gemstoneOptionId,
      })),
      personalizationPackage: body.personalizationPackage ?? 'NONE',
    });

    if (!res.isValid) {
      throw new UnprocessableEntityException({
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: 'Configuration validation failed',
        error: 'Unprocessable Entity',
        data: res,
      });
    }

    return res;
  }

  // ---------------------------------------------------------------------------
  // [CATAL-002] GET /api/v1/catalog/templates/:templateId
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates/:templateId')
  @ApiGetTemplateByIdDocs()
  async getTemplateById(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.getTemplateById({ templateId });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-003] GET /api/v1/catalog/templates/:templateId/configuration-options
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates/:templateId/configuration-options')
  @ApiGetTemplateConfigurationOptionsDocs()
  async getTemplateConfigurationOptions(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.getTemplateConfigurationOptions({ templateId });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-004] GET /api/v1/catalog/templates/:templateId/3d-assets
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates/:templateId/3d-assets')
  @ApiGetTemplate3DAssetsDocs()
  async getTemplate3DAssets(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.getTemplate3DAssets({ templateId });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-012] GET /api/v1/catalog/templates/:templateId/variants
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates/:templateId/variants')
  @ApiListTemplateVariantsDocs()
  async listTemplateVariants(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Query() query: ListVariantsQueryDto,
  ) {
    const res = await this.catalogClient.listTemplateVariants({
      templateId,
      materialId: query.materialId,
    });
    return res.data;
  }

  // ---------------------------------------------------------------------------
  // [CATAL-016] GET /api/v1/catalog/templates/:templateId/gemstone-slots
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates/:templateId/gemstone-slots')
  @ApiListGemstoneSlotsDocs()
  async listGemstoneSlots(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    const res = await this.catalogClient.listGemstoneSlots({ templateId });
    return res.data;
  }
}
