import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

export function ApiCreateTemplateDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-005] Create a new ring template (DRAFT)',
      description:
        'Requires CATALOG_TEMPLATE_MANAGE. Creates an unpublished template in DRAFT status.',
    }),
    ApiBearerAuth(),
    ApiResponse({ status: 201, description: 'Template created successfully' }),
    ApiResponse({ status: 409, description: 'Template code already exists' }),
    ApiResponse({ status: 403, description: 'Forbidden (Missing permission)' }),
  );
}

export function ApiUpdateTemplateDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-006] Update ring template details',
      description:
        'Requires CATALOG_TEMPLATE_MANAGE. Updates name, description, glb asset key or personalization packages.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'templateId', description: 'Template UUID' }),
    ApiResponse({ status: 200, description: 'Template updated successfully' }),
    ApiResponse({ status: 404, description: 'Template not found' }),
  );
}

export function ApiPublishTemplateDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-007] Publish ring template (DRAFT -> ACTIVE)',
      description:
        'Requires CATALOG_TEMPLATE_MANAGE. Template must have at least one physical variant before publishing.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'templateId', description: 'Template UUID' }),
    ApiResponse({ status: 200, description: 'Template published to catalog' }),
    ApiResponse({ status: 400, description: 'Template has no variants' }),
  );
}

export function ApiArchiveTemplateDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-008] Archive ring template (ACTIVE -> ARCHIVED)',
      description:
        'Requires CATALOG_TEMPLATE_MANAGE. Deactivates template from public catalog browse.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'templateId', description: 'Template UUID' }),
    ApiResponse({ status: 200, description: 'Template archived successfully' }),
  );
}
