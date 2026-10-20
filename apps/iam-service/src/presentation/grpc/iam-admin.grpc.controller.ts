import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AssignUserRoleRequest,
  AssignUserRoleResponse,
  GetUserAuthorizationRequest,
  GetUserAuthorizationResponse,
  ListPermissionsRequest,
  ListPermissionsResponse,
  GrantRolePermissionRequest,
  ListRolePermissionsRequest,
  ListRolePermissionsResponse,
  ListUserSecurityAuditEventsRequest,
  ListUserSecurityAuditEventsResponse,
  RevokeRolePermissionRequest,
  RolePermissionGrantResponse,
  ListRolesRequest,
  ListRolesResponse,
  ListUserRolesRequest,
  ListUserRolesResponse,
  ListUsersRequest,
  ListUsersResponse,
  ProvisionUserRequest,
  ProvisionUserResponse,
  RevokeUserRoleRequest,
  RevokeUserRoleResponse,
  UpdateUserStatusRequest,
  UpdateUserStatusResponse,
} from '@app/contracts';
import { CatalogAdminService } from '../../application/admin/catalog-admin.service';
import { SecurityAuditAdminService } from '../../application/admin/security-audit-admin.service';
import { UserAdminService } from '../../application/admin/user-admin.service';
import { UserRoleAdminService } from '../../application/admin/user-role-admin.service';
import {
  optionalText,
  requirePermissionCode,
  requireRoleCode,
  requireText,
  requireUserId,
} from './grpc-request';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';

@Controller()
@UseGuards(InternalGrpcAuthGuard)
export class IamAdminGrpcController {
  constructor(
    private readonly users: UserAdminService,
    private readonly userRoles: UserRoleAdminService,
    private readonly catalog: CatalogAdminService,
    private readonly securityAudit: SecurityAuditAdminService,
  ) {}

  @GrpcMethod('IamService', 'ListUsers')
  listUsers(request: ListUsersRequest): Promise<ListUsersResponse> {
    return this.users.listUsers({
      page: request.pagination?.page,
      limit: request.pagination?.limit,
      status: optionalText(request.status, 'Status', 20),
    });
  }

  @GrpcMethod('IamService', 'UpdateUserStatus')
  updateUserStatus(
    request: UpdateUserStatusRequest,
  ): Promise<UpdateUserStatusResponse> {
    return this.users.updateUserStatus({
      userId: requireUserId(request.userId),
      status: requireStatus(request.status),
      actorUserId: requireUserId(request.actorUserId),
    });
  }

  @GrpcMethod('IamService', 'ProvisionUser')
  provisionUser(request: ProvisionUserRequest): Promise<ProvisionUserResponse> {
    return this.users.provisionUser({
      email: requireEmail(request.email),
      fullName: requireText(request.fullName, 'Full name', 150),
      roleCode: requireRoleCode(request.roleCode),
      createdByUserId: requireUserId(request.createdByUserId),
    });
  }

  @GrpcMethod('IamService', 'ListRoles')
  listRoles(_request: ListRolesRequest): Promise<ListRolesResponse> {
    return this.catalog.listRoles();
  }

  @GrpcMethod('IamService', 'ListPermissions')
  listPermissions(
    _request: ListPermissionsRequest,
  ): Promise<ListPermissionsResponse> {
    return this.catalog.listPermissions();
  }

  @GrpcMethod('IamService', 'ListUserRoles')
  listUserRoles(request: ListUserRolesRequest): Promise<ListUserRolesResponse> {
    return this.userRoles.listUserRoles(requireUserId(request.userId));
  }

  @GrpcMethod('IamService', 'AssignUserRole')
  assignUserRole(
    request: AssignUserRoleRequest,
  ): Promise<AssignUserRoleResponse> {
    return this.userRoles.assignUserRole({
      userId: requireUserId(request.userId),
      roleCode: requireRoleCode(request.roleCode),
      assignedByUserId: requireUserId(request.assignedByUserId),
    });
  }

  @GrpcMethod('IamService', 'RevokeUserRole')
  revokeUserRole(
    request: RevokeUserRoleRequest,
  ): Promise<RevokeUserRoleResponse> {
    return this.userRoles.revokeUserRole({
      userId: requireUserId(request.userId),
      roleCode: requireRoleCode(request.roleCode),
      ...(request.reason === undefined
        ? {}
        : { reason: optionalText(request.reason, 'Reason', 500) }),
      actorUserId: requireUserId(request.actorUserId),
    });
  }

  @GrpcMethod('IamService', 'GetUserAuthorization')
  getUserAuthorization(
    request: GetUserAuthorizationRequest,
  ): Promise<GetUserAuthorizationResponse> {
    return this.catalog.getUserAuthorization(requireUserId(request.userId));
  }

  @GrpcMethod('IamService', 'ListRolePermissions')
  listRolePermissions(
    request: ListRolePermissionsRequest,
  ): Promise<ListRolePermissionsResponse> {
    return this.catalog.listRolePermissions(requireRoleCode(request.roleCode));
  }

  @GrpcMethod('IamService', 'GrantRolePermission')
  grantRolePermission(
    request: GrantRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse> {
    return this.catalog.grantRolePermission({
      roleCode: requireRoleCode(request.roleCode),
      permissionCode: requirePermissionCode(request.permissionCode),
      grantedByUserId: requireUserId(request.grantedByUserId),
    });
  }

  @GrpcMethod('IamService', 'RevokeRolePermission')
  revokeRolePermission(
    request: RevokeRolePermissionRequest,
  ): Promise<RolePermissionGrantResponse> {
    return this.catalog.revokeRolePermission({
      roleCode: requireRoleCode(request.roleCode),
      permissionCode: requirePermissionCode(request.permissionCode),
    });
  }

  @GrpcMethod('IamService', 'ListUserSecurityAuditEvents')
  listUserSecurityAuditEvents(
    request: ListUserSecurityAuditEventsRequest,
  ): Promise<ListUserSecurityAuditEventsResponse> {
    return this.securityAudit.listUserEvents({
      userId: requireUserId(request.userId),
      page: request.pagination?.page,
      limit: request.pagination?.limit,
    });
  }
}

function requireStatus(value: string | undefined): string {
  const status = optionalText(value, 'Status', 20);
  if (status === undefined) {
    throw new BadRequestException('Status is required');
  }
  return status;
}

function requireEmail(value: string | undefined): string {
  return requireText(value, 'Email', 320).toLowerCase();
}
