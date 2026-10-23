import {
  BadRequestException,
  Controller,
  UseGuards,
} from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  CatalogServiceHandler,
  GetConfigurationOptionsRequest,
  GetConfigurationOptionsResponse,
  GetRingTemplateDetailRequest,
  GetRingTemplateDetailResponse,
  GetTemplate3DAssetsRequest,
  GetTemplate3DAssetsResponse,
  ListRingTemplatesRequest,
  ListRingTemplatesResponse,
} from '@app/contracts';
import { CatalogService } from '../../application/catalog/catalog.service';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';
import {
  toConfigurationOptionsResponse,
  toGetTemplate3DAssetsResponse,
  toRingTemplateDetailMessage,
  toRingTemplateSummaryMessage,
} from './mappers/catalog.grpc.mapper';

@Controller()
@UseGuards(InternalGrpcAuthGuard)
export class CatalogGrpcController implements CatalogServiceHandler {
  constructor(private readonly catalog: CatalogService) {}

  @GrpcMethod('CatalogService', 'ListRingTemplates')
  async listRingTemplates(
    request: ListRingTemplatesRequest,
  ): Promise<ListRingTemplatesResponse> {
    const result = await this.catalog.listActiveRingTemplates({
      stoneLayout: request.stoneLayout,
      package: request.package,
      limit: request.limit,
      offset: request.offset,
    });

    return {
      items: result.items.map(toRingTemplateSummaryMessage),
      total: result.total,
    };
  }

  @GrpcMethod('CatalogService', 'GetRingTemplateDetail')
  async getRingTemplateDetail(
    request: GetRingTemplateDetailRequest,
  ): Promise<GetRingTemplateDetailResponse> {
    const templateId = requireTemplateId(request.templateId);
    const result = await this.catalog.getActiveRingTemplateDetail(templateId);

    return {
      template: toRingTemplateDetailMessage(result),
    };
  }

  @GrpcMethod('CatalogService', 'GetConfigurationOptions')
  async getConfigurationOptions(
    request: GetConfigurationOptionsRequest,
  ): Promise<GetConfigurationOptionsResponse> {
    const templateId = requireTemplateId(request.templateId);
    const result = await this.catalog.getConfigurationOptions(templateId);

    return toConfigurationOptionsResponse(result);
  }

  @GrpcMethod('CatalogService', 'GetTemplate3DAssets')
  async getTemplate3DAssets(
    request: GetTemplate3DAssetsRequest,
  ): Promise<GetTemplate3DAssetsResponse> {
    const templateId = requireTemplateId(request.templateId);
    const result = await this.catalog.getTemplate3DAssets(templateId);

    return toGetTemplate3DAssetsResponse(result);
  }
}

function requireTemplateId(templateId?: string): string {
  if (templateId === undefined || templateId.trim() === '') {
    throw new BadRequestException('templateId is required');
  }
  return templateId.trim();
}
