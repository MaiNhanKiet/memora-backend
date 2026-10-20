import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import { SuccessResponse as HttpSuccessResponse } from '@app/common';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toGrpcPagination } from '../../../../common/mappers/grpc-pagination.mapper';
import { toPaginatedSuccessResponse } from '../../../../common/mappers/paginated-success.mapper';
import type { AuthenticatedPrincipal } from '@app/auth';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import {
  ApiAssignUserRoleDocs,
  ApiGetUserAuthorizationDocs,
  ApiGetUserDocs,
  ApiListUserRolesDocs,
  ApiListUserSecurityAuditEventsDocs,
  ApiListUsersDocs,
  ApiProvisionUserDocs,
  ApiRevokeUserRoleDocs,
  ApiUpdateUserStatusDocs,
} from '../docs/user-management.swagger';
import { AssignUserRoleRequestDto } from '../dto/request/assign-user-role.request.dto';
import { GetUserParamsDto } from '../dto/request/get-user.request.dto';
import { ListUsersQueryDto } from '../dto/request/list-users.query.dto';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { ProvisionUserRequestDto } from '../dto/request/provision-user.request.dto';
import { RevokeUserRoleRequestDto } from '../dto/request/revoke-user-role.request.dto';
import { UpdateUserStatusRequestDto } from '../dto/request/update-user-status.request.dto';
import { UserRoleParamsDto } from '../dto/request/user-role.params.dto';
import type { AdminUserResponseDto } from '../dto/response/admin-user.response.dto';
import type { ProvisionUserResponseDto } from '../dto/response/provision-user.response.dto';
import type {
  AssignUserRoleResponseDto,
  RevokeUserRoleResponseDto,
  UserRoleAssignmentResponseDto,
} from '../dto/response/user-role-assignment.response.dto';
import type { UserAuthorizationResponseDto } from '../dto/response/user-authorization.response.dto';
import type { SecurityAuditEventResponseDto } from '../dto/response/security-audit-event.response.dto';
import type { UserStatusResponseDto } from '../dto/response/user-status.response.dto';
import {
  toAdminUserResponse,
  toSecurityAuditEventResponse,
} from '../mappers/user-management-http.mapper';
import { requireActorUserId } from '../utils/require-actor-user-id';

@ApiTags('IAM Users')
@Controller('admin/users')
export class UserManagementController {
  constructor(private readonly iam: IamGrpcClient) {}

  @Get()
  @RequirePermissions(PERMISSIONS.IAM_USER_READ)
  @ApiListUsersDocs()
  async listUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<HttpSuccessResponse<AdminUserResponseDto[]>> {
    const result = await this.iam.listUsers({
      pagination: toGrpcPagination(query),
      ...(query.status === undefined ? {} : { status: query.status }),
    });
    return toPaginatedSuccessResponse({
      data: result.users.map(toAdminUserResponse),
      pagination: result.pagination,
    });
  }

  @Post()
  @RequirePermissions(PERMISSIONS.IAM_USER_PROVISION)
  @HttpCode(201)
  @ApiProvisionUserDocs()
  async provisionUser(
    @CurrentUser() principal: AuthenticatedPrincipal | undefined,
    @Body() body: ProvisionUserRequestDto,
  ): Promise<ProvisionUserResponseDto> {
    return this.iam.provisionUser({
      email: body.email,
      fullName: body.fullName,
      roleCode: body.roleCode,
      createdByUserId: requireActorUserId(principal),
    });
  }

  @Get(':userId/authorization')
  @RequirePermissions(PERMISSIONS.IAM_USER_READ)
  @ApiGetUserAuthorizationDocs()
  async getUserAuthorization(
    @Param() params: GetUserParamsDto,
  ): Promise<UserAuthorizationResponseDto> {
    return this.iam.getUserAuthorization(params.userId);
  }

  @Get(':userId/roles')
  @RequirePermissions(PERMISSIONS.IAM_USER_READ)
  @ApiListUserRolesDocs()
  async listUserRoles(
    @Param() params: GetUserParamsDto,
  ): Promise<UserRoleAssignmentResponseDto[]> {
    const result = await this.iam.listUserRoles(params.userId);
    return result.assignments;
  }

  @Post(':userId/roles')
  @RequirePermissions(PERMISSIONS.IAM_USER_ROLE_ASSIGN)
  @HttpCode(201)
  @ApiAssignUserRoleDocs()
  async assignUserRole(
    @CurrentUser() principal: AuthenticatedPrincipal | undefined,
    @Param() params: GetUserParamsDto,
    @Body() body: AssignUserRoleRequestDto,
  ): Promise<AssignUserRoleResponseDto> {
    return this.iam.assignUserRole({
      userId: params.userId,
      roleCode: body.roleCode,
      assignedByUserId: requireActorUserId(principal),
    });
  }

  @Post(':userId/roles/:roleCode/revoke')
  @RequirePermissions(PERMISSIONS.IAM_USER_ROLE_ASSIGN)
  @HttpCode(200)
  @ApiRevokeUserRoleDocs()
  async revokeUserRole(
    @CurrentUser() principal: AuthenticatedPrincipal | undefined,
    @Param() params: UserRoleParamsDto,
    @Body() body: RevokeUserRoleRequestDto,
  ): Promise<RevokeUserRoleResponseDto> {
    return this.iam.revokeUserRole({
      userId: params.userId,
      roleCode: params.roleCode,
      actorUserId: requireActorUserId(principal),
      ...(body.reason === undefined ? {} : { reason: body.reason }),
    });
  }

  @Patch(':userId/status')
  @RequirePermissions(PERMISSIONS.IAM_USER_STATUS_MANAGE)
  @ApiUpdateUserStatusDocs()
  async updateUserStatus(
    @CurrentUser() principal: AuthenticatedPrincipal | undefined,
    @Param() params: GetUserParamsDto,
    @Body() body: UpdateUserStatusRequestDto,
  ): Promise<UserStatusResponseDto> {
    return this.iam.updateUserStatus({
      userId: params.userId,
      status: body.status,
      actorUserId: requireActorUserId(principal),
    });
  }

  @Get(':userId/security-audit-events')
  @RequirePermissions(PERMISSIONS.IAM_SECURITY_AUDIT_READ)
  @ApiListUserSecurityAuditEventsDocs()
  async listUserSecurityAuditEvents(
    @Param() params: GetUserParamsDto,
    @Query() query: PaginationQueryDto,
  ): Promise<HttpSuccessResponse<SecurityAuditEventResponseDto[]>> {
    const result = await this.iam.listUserSecurityAuditEvents({
      userId: params.userId,
      pagination: toGrpcPagination(query),
    });
    return toPaginatedSuccessResponse({
      data: result.events.map(toSecurityAuditEventResponse),
      pagination: result.pagination,
    });
  }

  @Get(':userId')
  @RequirePermissions(PERMISSIONS.IAM_USER_READ)
  @ApiGetUserDocs()
  async getUser(
    @Param() params: GetUserParamsDto,
  ): Promise<AdminUserResponseDto> {
    const result = await this.iam.getUserById(params.userId);
    return toAdminUserResponse(result.user);
  }
}
