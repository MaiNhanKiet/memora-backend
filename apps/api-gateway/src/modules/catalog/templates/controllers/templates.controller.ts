import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@app/common';
import { CatalogGrpcClient } from '../../clients/catalog-grpc.client';
import { ApiListTemplatesDocs } from '../docs/templates.swagger';
import { ListTemplatesQueryDto } from '../dto/request/list-templates.query.dto';
import type { ListTemplatesResponseDto } from '../dto/response/list-templates.response.dto';
import { toRingTemplateSummaryResponse } from '../mappers/catalog-http.mapper';

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
}
