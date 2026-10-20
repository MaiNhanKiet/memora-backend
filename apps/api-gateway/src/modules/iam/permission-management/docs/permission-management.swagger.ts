import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { PermissionCatalogItemResponseDto } from '../dto/response/permission-catalog.response.dto';

export function ApiListPermissionsDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'List the permission catalog',
      description:
        'Requires permission `IAM_RBAC_MANAGE`. This route does not create codes.',
    }),
    ApiSuccessResponse({
      type: PermissionCatalogItemResponseDto,
      isArray: true,
    }),
    ApiResponse({
      status: 401,
      description: 'Missing or invalid access token',
    }),
    ApiResponse({ status: 403, description: 'Caller lacks IAM_RBAC_MANAGE' }),
  );
}
