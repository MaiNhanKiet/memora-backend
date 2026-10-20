import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequireAnyPermissions, RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import { requireActorUserId } from '../../user-management/utils/require-actor-user-id';
import {
  ApiGrantRolePermissionDocs,
  ApiListRolePermissionsDocs,
  ApiListRolesDocs,
  ApiRevokeRolePermissionDocs,
} from '../docs/role-management.swagger';
import { GrantRolePermissionRequestDto } from '../dto/request/grant-role-permission.request.dto';
import { RoleCodeParamsDto } from '../dto/request/role-code.params.dto';
import { RolePermissionParamsDto } from '../dto/request/role-permission.params.dto';
import type {
  RoleCatalogItemResponseDto,
  RolePermissionGrantResponseDto,
  RolePermissionsResponseDto,
} from '../dto/response/role-catalog.response.dto';

@ApiTags('IAM Roles')
@Controller('admin/roles')
export class RoleManagementController {
  constructor(private readonly iam: IamGrpcClient) {}

  @Get()
  @RequireAnyPermissions(
    PERMISSIONS.IAM_USER_ROLE_ASSIGN,
    PERMISSIONS.IAM_RBAC_MANAGE,
  )
  @ApiListRolesDocs()
  async listRoles(): Promise<RoleCatalogItemResponseDto[]> {
    const result = await this.iam.listRoles();
    return result.roles;
  }

  @Get(':roleCode/permissions')
  @RequirePermissions(PERMISSIONS.IAM_RBAC_MANAGE)
  @ApiListRolePermissionsDocs()
  async listRolePermissions(
    @Param() params: RoleCodeParamsDto,
  ): Promise<RolePermissionsResponseDto> {
    return this.iam.listRolePermissions(params.roleCode);
  }

  @Post(':roleCode/permissions')
  @RequirePermissions(PERMISSIONS.IAM_RBAC_MANAGE)
  @HttpCode(201)
  @ApiGrantRolePermissionDocs()
  grantRolePermission(
    @CurrentUser() principal: AuthenticatedPrincipal | undefined,
    @Param() params: RoleCodeParamsDto,
    @Body() body: GrantRolePermissionRequestDto,
  ): Promise<RolePermissionGrantResponseDto> {
    return this.iam.grantRolePermission({
      roleCode: params.roleCode,
      permissionCode: body.permissionCode,
      grantedByUserId: requireActorUserId(principal),
    });
  }

  @Delete(':roleCode/permissions/:permissionCode')
  @RequirePermissions(PERMISSIONS.IAM_RBAC_MANAGE)
  @ApiRevokeRolePermissionDocs()
  revokeRolePermission(
    @Param() params: RolePermissionParamsDto,
  ): Promise<RolePermissionGrantResponseDto> {
    return this.iam.revokeRolePermission({
      roleCode: params.roleCode,
      permissionCode: params.permissionCode,
    });
  }
}
