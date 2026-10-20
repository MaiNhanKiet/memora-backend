import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type {
  GetUserAuthorizationResponse,
  ListPermissionsResponse,
  ListRolePermissionsResponse,
  ListRolesResponse,
  RolePermissionGrantResponse,
} from '@app/contracts';
import { AuthorizationService } from '../authorization/authorization.service';
import { PermissionRepository } from '../../repositories/permission.repository';
import { RoleRepository } from '../../repositories/role.repository';
import { RolePermissionRepository } from '../../repositories/role-permission.repository';
import { UserRepository } from '../../repositories/user.repository';

@Injectable()
export class CatalogAdminService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly rolePermissions: RolePermissionRepository,
    private readonly users: UserRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async listRoles(): Promise<ListRolesResponse> {
    const rows = await this.roles.findAllOrdered();
    return {
      roles: rows.map((role) => ({
        code: role.code,
        name: role.name,
        ...(role.description === null ? {} : { description: role.description }),
        isActive: role.isActive,
      })),
    };
  }

  async listPermissions(): Promise<ListPermissionsResponse> {
    const rows = await this.permissions.findAllOrdered();
    return {
      permissions: rows.map((permission) => ({
        code: permission.code,
        name: permission.name,
        ...(permission.description === null
          ? {}
          : { description: permission.description }),
        isActive: permission.isActive,
      })),
    };
  }

  async listRolePermissions(
    roleCode: string,
  ): Promise<ListRolePermissionsResponse> {
    const role = await this.roles.findByCode(roleCode);
    if (role === null) {
      throw new NotFoundException('Role not found');
    }
    const grants = await this.rolePermissions.findActivePermissionsByRoleIds([
      role.id,
    ]);
    const codes = grants
      .map((grant) => grant.permission.code)
      .sort((left, right) => left.localeCompare(right));
    return {
      roleCode: role.code,
      permissionCodes: codes,
    };
  }

  async getUserAuthorization(
    userId: string,
  ): Promise<GetUserAuthorizationResponse> {
    const user = await this.users.findById(userId);
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const effective =
      await this.authorization.getEffectiveAuthorization(userId);
    return {
      userId,
      status: user.status,
      roleCodes: effective.roleCodes,
      permissionCodes: effective.permissionCodes,
    };
  }

  async grantRolePermission(input: {
    roleCode: string;
    permissionCode: string;
    grantedByUserId: string;
  }): Promise<RolePermissionGrantResponse> {
    const role = await this.requireActiveRole(input.roleCode);
    const permission = await this.requireActivePermission(input.permissionCode);
    const actor = await this.users.findById(input.grantedByUserId);
    if (actor === null) {
      throw new NotFoundException('User not found');
    }
    try {
      await this.rolePermissions.grant({
        roleId: role.id,
        permissionId: permission.id,
        grantedByUserId: actor.id,
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Role permission grant already exists');
      }
      throw error;
    }
    return { roleCode: role.code, permissionCode: permission.code };
  }

  async revokeRolePermission(input: {
    roleCode: string;
    permissionCode: string;
  }): Promise<RolePermissionGrantResponse> {
    const role = await this.requireActiveRole(input.roleCode);
    const permission = await this.requireActivePermission(input.permissionCode);
    const grant = await this.rolePermissions.findByRoleAndPermission(
      role.id,
      permission.id,
    );
    if (grant === null) {
      throw new NotFoundException('Role permission grant not found');
    }
    await this.rolePermissions.deleteById(grant.id);
    return { roleCode: role.code, permissionCode: permission.code };
  }

  private async requireActiveRole(roleCode: string) {
    const role = await this.roles.findByCode(roleCode);
    if (role === null || !role.isActive) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  private async requireActivePermission(permissionCode: string) {
    const permission = await this.permissions.findByCode(permissionCode);
    if (permission === null || !permission.isActive) {
      throw new NotFoundException('Permission not found');
    }
    return permission;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
