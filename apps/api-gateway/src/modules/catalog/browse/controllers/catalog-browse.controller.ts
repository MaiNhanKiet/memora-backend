import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { toPaginatedSuccessResponse } from '../../../../common/mappers/paginated-success.mapper';
import { CatalogGrpcClient } from '../../clients/catalog-grpc.client';
import {
  ListGemstoneOptionsQueryDto,
  ListTemplatesQueryDto,
  ListVariantsQueryDto,
  ValidateConfigurationBodyDto,
} from '../dto';
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
} from '../docs/catalog-browse.swagger';
import {
  toGetGemstoneSlotsGrpcRequest,
  toGetResizePoliciesGrpcRequest,
  toGetTemplate3DAssetsGrpcRequest,
  toGetTemplateByIdGrpcRequest,
  toGetTemplateConfigurationOptionsGrpcRequest,
  toListGemstoneOptionsGrpcRequest,
  toListMaterialsGrpcRequest,
  toListTemplatesGrpcRequest,
  toListTemplateVariantsGrpcRequest,
  toValidateConfigurationGrpcRequest,
} from '../mappers/catalog-browse-http.mapper';

@ApiTags('commerce-catalog')
@Controller('catalog')
export class CatalogBrowseController {
  constructor(private readonly catalogClient: CatalogGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [CATAL-001] GET /api/v1/catalog/templates
  // ---------------------------------------------------------------------------
  @Public()
  @Get('templates')
  @ApiListTemplatesDocs()
  async listTemplates(@Query() query: ListTemplatesQueryDto) {
    const res = await this.catalogClient.listTemplates(
      toListTemplatesGrpcRequest(query),
    );
    return toPaginatedSuccessResponse({
      data: res.data ?? [],
      pagination: res.pagination,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-009] GET /api/v1/catalog/materials (Placed before :templateId)
  // ---------------------------------------------------------------------------
  @Public()
  @Get('materials')
  @ApiListMaterialsDocs()
  async listMaterials() {
    const res = await this.catalogClient.listMaterials(
      toListMaterialsGrpcRequest('ACTIVE'),
    );
    return res.data ?? [];
  }

  // ---------------------------------------------------------------------------
  // [CATAL-015] GET /api/v1/catalog/gemstone-options (Placed before :templateId)
  // ---------------------------------------------------------------------------
  @Public()
  @Get('gemstone-options')
  @ApiListGemstoneOptionsDocs()
  async listGemstoneOptions(@Query() query: ListGemstoneOptionsQueryDto) {
    const res = await this.catalogClient.listGemstoneOptions(
      toListGemstoneOptionsGrpcRequest(query),
    );
    return toPaginatedSuccessResponse({
      data: res.data ?? [],
      pagination: res.pagination,
    });
  }

  // ---------------------------------------------------------------------------
  // [CATAL-021] POST /api/v1/catalog/configurations/validate
  // ---------------------------------------------------------------------------
  @Public()
  @Post('configurations/validate')
  @ApiValidateConfigurationDocs()
  async validateConfiguration(@Body() body: ValidateConfigurationBodyDto) {
    return this.catalogClient.validateConfiguration(
      toValidateConfigurationGrpcRequest(body),
    );
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
    return this.catalogClient.getTemplateById(
      toGetTemplateByIdGrpcRequest(templateId),
    );
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
    return this.catalogClient.getTemplateConfigurationOptions(
      toGetTemplateConfigurationOptionsGrpcRequest(templateId),
    );
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
    return this.catalogClient.getTemplate3DAssets(
      toGetTemplate3DAssetsGrpcRequest(templateId),
    );
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
    const res = await this.catalogClient.listTemplateVariants(
      toListTemplateVariantsGrpcRequest(templateId, query),
    );
    return res.data ?? [];
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
    const res = await this.catalogClient.listGemstoneSlots(
      toGetGemstoneSlotsGrpcRequest(templateId),
    );
    return res.data ?? [];
  }

  // ---------------------------------------------------------------------------
  // [CATAL-019] GET /api/v1/catalog/resize-policies
  // ---------------------------------------------------------------------------
  @Public()
  @Get('resize-policies')
  async getResizePolicies(
    @Query('templateVariantId') templateVariantId?: string,
    @Query('templateId') templateId?: string,
  ) {
    const res = await this.catalogClient.getResizePolicies(
      toGetResizePoliciesGrpcRequest(templateVariantId, templateId),
    );
    return res.data ?? [];
  }
}
