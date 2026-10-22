import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { ListTemplatesResponseDto } from '../dto/response/list-templates.response.dto';

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
