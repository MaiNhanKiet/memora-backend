import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { CatalogGrpcClient } from '../../clients/catalog-grpc.client';
import {
  ApiGetConfigurationOptionsDocs,
  ApiGetTemplate3DAssetsDocs,
  ApiGetTemplateDetailDocs,
  ApiListTemplatesDocs,
} from '../docs/templates.swagger';
import { ListTemplatesQueryDto } from '../dto/request/list-templates.query.dto';
import type { ConfigurationOptionsResponseDto } from '../dto/response/configuration-options.response.dto';
import type { ListTemplatesResponseDto } from '../dto/response/list-templates.response.dto';
import type { RingTemplateDetailResponseDto } from '../dto/response/ring-template-detail.response.dto';
import type { Template3DAssetsResponseDto } from '../dto/response/template-3d-assets.response.dto';
import {
  toConfigurationOptionsResponse,
  toRingTemplateDetailResponse,
  toRingTemplateSummaryResponse,
  toTemplate3DAssetsResponse,
} from '../mappers/catalog-http.mapper';

@ApiTags('Catalog')
@Controller('catalog/templates')
export class TemplatesController {
  constructor(private readonly catalog: CatalogGrpcClient) {}

  @Get()
  @Public()
  @ApiListTemplatesDocs()
  async listTemplates(
    @Query() query: ListTemplatesQueryDto,
  ): Promise<ListTemplatesResponseDto> {
    const result = await this.catalog.listRingTemplates({
      stoneLayout: query.stone_layout,
      package: query.package,
      limit: query.limit,
      offset: query.offset,
    });

    return {
      items: result.items.map(toRingTemplateSummaryResponse),
      total: result.total,
    };
  }

  @Get(':templateId')
  @Public()
  @ApiGetTemplateDetailDocs()
  async getTemplateDetail(
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
  ): Promise<RingTemplateDetailResponseDto> {
    const result = await this.catalog.getRingTemplateDetail(templateId);
    return toRingTemplateDetailResponse(result.template);
  }

  @Get(':templateId/configuration-options')
  @Public()
  @ApiGetConfigurationOptionsDocs()
  async getConfigurationOptions(
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
  ): Promise<ConfigurationOptionsResponseDto> {
    const result = await this.catalog.getConfigurationOptions(templateId);
    return toConfigurationOptionsResponse(result);
  }

  @Get(':templateId/3d-assets')
  @Public()
  @ApiGetTemplate3DAssetsDocs()
  async getTemplate3DAssets(
    @Param('templateId', new ParseUUIDPipe({ version: '4' }))
    templateId: string,
  ): Promise<Template3DAssetsResponseDto> {
    const result = await this.catalog.getTemplate3DAssets(templateId);
    return toTemplate3DAssetsResponse(result);
  }
}


