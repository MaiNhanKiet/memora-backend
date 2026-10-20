import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  RoleCatalogItemResponseDto,
  RolePermissionGrantResponseDto,
  RolePermissionsResponseDto,
} from '../dto/response/role-catalog.response.dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});

export function ApiListRolesDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'List the role catalog',
      description:
        'Requires `IAM_USER_ROLE_ASSIGN` or `IAM_RBAC_MANAGE`. Either permission is enough.',
    }),
    ApiSuccessResponse({ type: RoleCatalogItemResponseDto, isArray: true }),
    unauthorized,
    ApiResponse({
      status: 403,
      description:
        'Caller has neither IAM_USER_ROLE_ASSIGN nor IAM_RBAC_MANAGE',
    }),
  );
}

export function ApiListRolePermissionsDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'List permission codes granted to one role',
      description: 'Requires permission `IAM_RBAC_MANAGE`.',
    }),
    ApiSuccessResponse({ type: RolePermissionsResponseDto }),
    unauthorized,
    ApiResponse({ status: 403, description: 'Caller lacks IAM_RBAC_MANAGE' }),
    ApiResponse({ status: 404, description: 'Role not found' }),
  );
}

export function ApiGrantRolePermissionDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Grant one catalog permission to a role',
      description: 'Requires permission `IAM_RBAC_MANAGE`.',
    }),
    ApiSuccessResponse({ type: RolePermissionGrantResponseDto, status: 201 }),
    unauthorized,
    ApiResponse({
      status: 400,
      description: 'Invalid role or permission code',
    }),
    ApiResponse({ status: 403, description: 'Caller lacks IAM_RBAC_MANAGE' }),
    ApiResponse({
      status: 404,
      description: 'Role, permission, or actor not found',
    }),
    ApiResponse({ status: 409, description: 'Grant already exists' }),
  );
}

export function ApiRevokeRolePermissionDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Remove one permission grant from a role',
      description:
        'Requires permission `IAM_RBAC_MANAGE`. Deletes the grant row.',
    }),
    ApiSuccessResponse({ type: RolePermissionGrantResponseDto }),
    unauthorized,
    ApiResponse({
      status: 400,
      description: 'Invalid role or permission code',
    }),
    ApiResponse({ status: 403, description: 'Caller lacks IAM_RBAC_MANAGE' }),
    ApiResponse({
      status: 404,
      description: 'Role, permission, or grant not found',
    }),
  );
}
