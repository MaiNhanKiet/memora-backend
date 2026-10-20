import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { AssignUserRoleRequestDto } from '../dto/request/assign-user-role.request.dto';
import { ProvisionUserRequestDto } from '../dto/request/provision-user.request.dto';
import { RevokeUserRoleRequestDto } from '../dto/request/revoke-user-role.request.dto';
import { UpdateUserStatusRequestDto } from '../dto/request/update-user-status.request.dto';
import { AdminUserResponseDto } from '../dto/response/admin-user.response.dto';
import { ProvisionUserResponseDto } from '../dto/response/provision-user.response.dto';
import {
  AssignUserRoleResponseDto,
  RevokeUserRoleResponseDto,
  UserRoleAssignmentResponseDto,
} from '../dto/response/user-role-assignment.response.dto';
import { UserAuthorizationResponseDto } from '../dto/response/user-authorization.response.dto';
import { SecurityAuditEventResponseDto } from '../dto/response/security-audit-event.response.dto';
import { UserStatusResponseDto } from '../dto/response/user-status.response.dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});

function forbidden(permission: string) {
  return ApiResponse({
    status: 403,
    description: `Caller lacks ${permission}`,
  });
}

export function ApiListUsersDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'List user accounts for administration',
      description: 'Requires permission `IAM_USER_READ`.',
    }),
    ApiSuccessResponse({
      type: AdminUserResponseDto,
      isArray: true,
      paginated: true,
    }),
    ApiResponse({ status: 400, description: 'Invalid page, limit, or status' }),
    unauthorized,
    forbidden('IAM_USER_READ'),
  );
}

export function ApiGetUserDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Get one user account for administration',
      description: 'Requires permission `IAM_USER_READ`.',
    }),
    ApiSuccessResponse({ type: AdminUserResponseDto }),
    ApiResponse({ status: 400, description: 'userId is not a UUID' }),
    unauthorized,
    forbidden('IAM_USER_READ'),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiProvisionUserDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Provision a staff account',
      description:
        'Requires permission `IAM_USER_PROVISION`. CUSTOMER is rejected. initialPassword is returned once.',
    }),
    ApiBody({ type: ProvisionUserRequestDto }),
    ApiSuccessResponse({ type: ProvisionUserResponseDto, status: 201 }),
    ApiResponse({ status: 400, description: 'Invalid body or CUSTOMER role' }),
    unauthorized,
    forbidden('IAM_USER_PROVISION'),
    ApiResponse({ status: 404, description: 'Role not found' }),
    ApiResponse({ status: 409, description: 'Email already in use' }),
  );
}

export function ApiListUserRolesDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'List active role assignments for one user',
      description:
        'Requires permission `IAM_USER_READ`. Revoked rows are omitted.',
    }),
    ApiSuccessResponse({ type: UserRoleAssignmentResponseDto, isArray: true }),
    ApiResponse({ status: 400, description: 'userId is not a UUID' }),
    unauthorized,
    forbidden('IAM_USER_READ'),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiAssignUserRoleDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Assign one role to a user',
      description: 'Requires permission `IAM_USER_ROLE_ASSIGN`.',
    }),
    ApiBody({ type: AssignUserRoleRequestDto }),
    ApiSuccessResponse({ type: AssignUserRoleResponseDto, status: 201 }),
    ApiResponse({ status: 400, description: 'Invalid userId or roleCode' }),
    unauthorized,
    forbidden('IAM_USER_ROLE_ASSIGN'),
    ApiResponse({ status: 404, description: 'User or role not found' }),
    ApiResponse({
      status: 409,
      description: 'Active assignment already exists',
    }),
  );
}

export function ApiRevokeUserRoleDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Revoke one active role assignment',
      description: 'Requires permission `IAM_USER_ROLE_ASSIGN`.',
    }),
    ApiBody({ type: RevokeUserRoleRequestDto }),
    ApiSuccessResponse({ type: RevokeUserRoleResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid userId or roleCode' }),
    unauthorized,
    forbidden('IAM_USER_ROLE_ASSIGN'),
    ApiResponse({ status: 404, description: 'User or role not found' }),
    ApiResponse({ status: 409, description: 'No active assignment' }),
  );
}

export function ApiUpdateUserStatusDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Change a user account status',
      description: 'Requires permission `IAM_USER_STATUS_MANAGE`.',
    }),
    ApiBody({ type: UpdateUserStatusRequestDto }),
    ApiSuccessResponse({ type: UserStatusResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid userId or status' }),
    unauthorized,
    forbidden('IAM_USER_STATUS_MANAGE'),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiListUserSecurityAuditEventsDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'List security audit events for one user',
      description: 'Requires permission `IAM_SECURITY_AUDIT_READ`.',
    }),
    ApiSuccessResponse({
      type: SecurityAuditEventResponseDto,
      isArray: true,
      paginated: true,
    }),
    ApiResponse({ status: 400, description: 'Invalid userId, page, or limit' }),
    unauthorized,
    forbidden('IAM_SECURITY_AUDIT_READ'),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiGetUserAuthorizationDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: 'Read one user effective authorization',
      description: 'Requires permission `IAM_USER_READ`.',
    }),
    ApiSuccessResponse({ type: UserAuthorizationResponseDto }),
    ApiResponse({ status: 400, description: 'userId is not a UUID' }),
    unauthorized,
    forbidden('IAM_USER_READ'),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}
