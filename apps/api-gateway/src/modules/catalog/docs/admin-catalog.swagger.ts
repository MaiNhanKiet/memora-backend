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

export function ApiCreateMaterialDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-010] Create new material definition',
      description:
        'Requires CATALOG_OPTION_MANAGE. Defines gold, platinum, or silver alloy specifications.',
    }),
    ApiBearerAuth(),
    ApiResponse({ status: 201, description: 'Material created successfully' }),
    ApiResponse({ status: 409, description: 'Material code already exists' }),
  );
}

export function ApiUpdateMaterialDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-011] Update material details',
      description: 'Requires CATALOG_OPTION_MANAGE. Updates purity or color.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'materialId', description: 'Material UUID' }),
    ApiResponse({ status: 200, description: 'Material updated successfully' }),
  );
}

export function ApiCreateVariantDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-013] Create template variant',
      description:
        'Requires CATALOG_VARIANT_MANAGE. Links template to material with size and wall thickness specifications.',
    }),
    ApiBearerAuth(),
    ApiResponse({ status: 201, description: 'Variant created successfully' }),
    ApiResponse({ status: 404, description: 'Template or material not found' }),
  );
}

export function ApiUpdateVariantDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-014] Update template variant',
      description:
        'Requires CATALOG_VARIANT_MANAGE. Updates sizing deltas, wall thickness and engraving depths.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'variantId', description: 'Variant UUID' }),
    ApiResponse({ status: 200, description: 'Variant updated successfully' }),
  );
}

export function ApiCreateGemstoneOptionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-017] Create gemstone option',
      description:
        'Requires CATALOG_OPTION_MANAGE. Creates gemstone spec (diamond/sapphire cut, dimensions, grade).',
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 201,
      description: 'Gemstone option created successfully',
    }),
    ApiResponse({ status: 409, description: 'Code already exists' }),
  );
}

export function ApiUpdateCompatibilitiesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-018] Update template compatibilities',
      description:
        'Requires CATALOG_OPTION_MANAGE. Sets allowed gemstone options for a template variant slot group.',
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Compatibilities updated successfully',
    }),
  );
}

export function ApiGetResizePoliciesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-019] Get ring resize policy limits',
      description:
        'Public endpoint. Tra cứu giới hạn chỉnh size (min/max size, max delta) và độ dày thành nhẫn.',
    }),
    ApiResponse({
      status: 200,
      description: 'Resize policy limits returned successfully',
    }),
  );
}

export function ApiUpdateResizePoliciesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-020] Update resize policies',
      description:
        'Requires CATALOG_VARIANT_MANAGE. Cập nhật giới hạn resize (max up/down delta, added metal allowed).',
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Resize policy updated successfully',
    }),
  );
}
