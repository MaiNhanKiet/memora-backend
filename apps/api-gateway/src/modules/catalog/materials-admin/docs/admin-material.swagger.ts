import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

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
    ApiResponse({ status: 403, description: 'Forbidden (Missing permission)' }),
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
    ApiResponse({ status: 404, description: 'Material not found' }),
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
    ApiResponse({ status: 404, description: 'Variant not found' }),
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
