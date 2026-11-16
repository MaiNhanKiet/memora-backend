import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CatalogGrpcClient } from '../../clients/catalog-grpc.client';
import { CreateTemplateBodyDto, UpdateTemplateBodyDto } from '../dto';
import {
  ApiArchiveTemplateDocs,
  ApiPublishTemplateDocs,
  ApiCreateTemplateDocs,
  ApiUpdateTemplateDocs,
} from '../docs/admin-template.swagger';
import {
  toArchiveTemplateGrpcRequest,
  toCreateTemplateGrpcRequest,
  toPublishTemplateGrpcRequest,
  toUpdateTemplateGrpcRequest,
} from '../mappers/admin-template-http.mapper';

@ApiTags('commerce-admin-catalog')
@Controller('admin/catalog/templates')
export class AdminTemplateController {
  constructor(private readonly catalogClient: CatalogGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [CATAL-005] POST /api/v1/admin/catalog/templates
  // ---------------------------------------------------------------------------
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiCreateTemplateDocs()
  async createTemplate(
    @Body() body: CreateTemplateBodyDto,
    @CurrentUser() principal?: AuthenticatedPrincipal,
  ) {
    return this.catalogClient.createTemplate(
      toCreateTemplateGrpcRequest(body, principal?.userId),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-006] PATCH /api/v1/admin/catalog/templates/:templateId
  // ---------------------------------------------------------------------------
  @Patch(':templateId')
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiUpdateTemplateDocs()
  async updateTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
    @Body() body: UpdateTemplateBodyDto,
  ) {
    return this.catalogClient.updateTemplate(
      toUpdateTemplateGrpcRequest(templateId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-007] POST /api/v1/admin/catalog/templates/:templateId/publish
  // ---------------------------------------------------------------------------
  @Post(':templateId/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiPublishTemplateDocs()
  async publishTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.publishTemplate(
      toPublishTemplateGrpcRequest(templateId),
    );
  }

  // ---------------------------------------------------------------------------
  // [CATAL-008] POST /api/v1/admin/catalog/templates/:templateId/archive
  // ---------------------------------------------------------------------------
  @Post(':templateId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(PERMISSIONS.CATALOG_TEMPLATE_MANAGE)
  @ApiArchiveTemplateDocs()
  async archiveTemplate(
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.catalogClient.archiveTemplate(
      toArchiveTemplateGrpcRequest(templateId),
    );
  }
}
