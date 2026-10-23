import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { ConfigurationOptionsResponseDto } from '../dto/response/configuration-options.response.dto';
import { ListTemplatesResponseDto } from '../dto/response/list-templates.response.dto';
import { RingTemplateDetailResponseDto } from '../dto/response/ring-template-detail.response.dto';
import { Template3DAssetsResponseDto } from '../dto/response/template-3d-assets.response.dto';

export function ApiListTemplatesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'List active ring templates',
      description:
        'Browse and filter active ring templates for catalog discovery. Only templates with status ACTIVE are returned.',
    }),
    ApiSuccessResponse({ type: ListTemplatesResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid query parameters (stone_layout or package)',
    }),
  );
}

export function ApiGetTemplateDetailDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get ring template details by ID',
      description:
        'Retrieve full specifications of a ring template, including 3D asset metadata, supported personalization packages, and cylindrical engraving surface boundaries (ENGRAVE_SURFACE).',
    }),
    ApiParam({
      name: 'templateId',
      description: 'UUID of the ring template',
      type: 'string',
      format: 'uuid',
      example: 'd9b9a6b2-658f-4c55-b04f-e224e78b7b25',
    }),
    ApiSuccessResponse({ type: RingTemplateDetailResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid templateId parameter format',
    }),
    ApiResponse({
      status: 404,
      description: 'Ring template not found or not active',
    }),
  );
}

export function ApiGetConfigurationOptionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get configuration options for a template',
      description:
        'Retrieve valid customizable axes and compatibility rules for a template: sizes, materials, gemstone groups, and eligible gemstones.',
    }),
    ApiParam({
      name: 'templateId',
      description: 'UUID of the ring template',
      type: 'string',
      format: 'uuid',
      example: 'd9b9a6b2-658f-4c55-b04f-e224e78b7b25',
    }),
    ApiSuccessResponse({ type: ConfigurationOptionsResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid templateId parameter format',
    }),
    ApiResponse({
      status: 404,
      description: 'Ring template not found or not active',
    }),
  );
}

export function ApiGetTemplate3DAssetsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get 3D assets metadata for a template',
      description:
        'Retrieve 3D model asset key (GLB), slot anchor points mapped to mesh node names, and cylindrical engraving boundaries for WebGL/3D viewer rendering.',
    }),
    ApiParam({
      name: 'templateId',
      description: 'UUID of the ring template',
      type: 'string',
      format: 'uuid',
      example: 'd9b9a6b2-658f-4c55-b04f-e224e78b7b25',
    }),
    ApiSuccessResponse({ type: Template3DAssetsResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid templateId parameter format',
    }),
    ApiResponse({
      status: 404,
      description: 'Ring template not found or not active',
    }),
  );
}


