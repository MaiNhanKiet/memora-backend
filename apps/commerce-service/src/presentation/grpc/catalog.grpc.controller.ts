import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  CatalogServiceHandler,
  ListRingTemplatesRequest,
  ListRingTemplatesResponse,
} from '@app/contracts';
import { CatalogService } from '../../application/catalog/catalog.service';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';
import { toRingTemplateSummaryMessage } from './mappers/catalog.grpc.mapper';

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
}
