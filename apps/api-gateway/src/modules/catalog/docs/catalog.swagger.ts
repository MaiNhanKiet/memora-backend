import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import {
  GemstoneOptionResponseDto,
  GemstoneSlotResponseDto,
  MaterialResponseDto,
  Template3DAssetsResponseDto,
  TemplateConfigurationOptionsResponseDto,
  TemplateResponseDto,
  TemplateVariantResponseDto,
  ValidateConfigurationResponseDto,
} from '../dto/response/catalog-response.dto';

export function ApiListTemplatesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-001] List ring templates',
      description: 'Search and filter active ring templates with pagination',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({
      name: 'gender',
      required: false,
      type: String,
      example: 'WOMEN',
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      example: 'Classic',
    }),
    ApiSuccessResponse({
      type: TemplateResponseDto,
      status: 200,
      description: 'Paginated list of ring templates',
      isArray: true,
      paginated: true,
    }),
  );
}

export function ApiGetTemplateByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-002] Get ring template by ID',
      description: 'Get full details of a specific active ring template',
    }),
    ApiParam({
      name: 'templateId',
      type: String,
      description: 'Template UUID',
    }),
    ApiSuccessResponse({
      type: TemplateResponseDto,
      status: 200,
      description: 'Template details',
    }),
    ApiResponse({ status: 404, description: 'Template not found' }),
  );
}

export function ApiGetTemplateConfigurationOptionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-003] Get configuration options for 3D configurator',
      description:
        'Aggregated options including materials, variants, gemstone slots, and packages',
    }),
    ApiParam({
      name: 'templateId',
      type: String,
      description: 'Template UUID',
    }),
    ApiSuccessResponse({
      type: TemplateConfigurationOptionsResponseDto,
      status: 200,
      description: 'Aggregated configuration options',
    }),
    ApiResponse({ status: 404, description: 'Template not found' }),
  );
}

export function ApiGetTemplate3DAssetsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-004] Get template 3D assets',
      description: 'GLB model asset URL and anchor nodes metadata',
    }),
    ApiParam({
      name: 'templateId',
      type: String,
      description: 'Template UUID',
    }),
    ApiSuccessResponse({
      type: Template3DAssetsResponseDto,
      status: 200,
      description: '3D assets and anchor nodes',
    }),
    ApiResponse({ status: 404, description: 'Template not found' }),
  );
}

export function ApiListMaterialsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-009] List available jewellery materials',
      description: 'List active materials (gold types, platinum, etc.)',
    }),
    ApiSuccessResponse({
      type: MaterialResponseDto,
      status: 200,
      description: 'List of materials',
      isArray: true,
    }),
  );
}

export function ApiListTemplateVariantsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-012] List template variants',
      description:
        'List variants including standard sizes and resize boundaries for a template',
    }),
    ApiParam({
      name: 'templateId',
      type: String,
      description: 'Template UUID',
    }),
    ApiQuery({
      name: 'materialId',
      required: false,
      type: String,
      description: 'Optional material UUID filter',
    }),
    ApiSuccessResponse({
      type: TemplateVariantResponseDto,
      status: 200,
      description: 'List of template variants',
      isArray: true,
    }),
  );
}

export function ApiListGemstoneOptionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-015] List gemstone options',
      description:
        'Search and filter gemstone options with pagination and certified indicator',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiQuery({
      name: 'stoneType',
      required: false,
      type: String,
      example: 'DIAMOND',
    }),
    ApiQuery({
      name: 'shape',
      required: false,
      type: String,
      example: 'ROUND',
    }),
    ApiQuery({
      name: 'isCertified',
      required: false,
      type: Boolean,
      example: true,
    }),
    ApiSuccessResponse({
      type: GemstoneOptionResponseDto,
      status: 200,
      description: 'Paginated list of gemstone options',
      isArray: true,
      paginated: true,
    }),
  );
}

export function ApiListGemstoneSlotsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-016] List gemstone slots for template',
      description: 'List stone placement slots and node anchors',
    }),
    ApiParam({
      name: 'templateId',
      type: String,
      description: 'Template UUID',
    }),
    ApiSuccessResponse({
      type: GemstoneSlotResponseDto,
      status: 200,
      description: 'List of gemstone slots',
      isArray: true,
    }),
  );
}

export function ApiValidateConfigurationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[CATAL-021] Validate ring configuration before add to cart',
      description:
        'Verify resize boundaries, slot stone requirements, and compatibility',
    }),
    ApiSuccessResponse({
      type: ValidateConfigurationResponseDto,
      status: 200,
      description: 'Configuration validation result',
    }),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity - invalid configuration',
    }),
  );
}
