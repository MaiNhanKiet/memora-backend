import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import type {
  AssignUserRoleResponse,
  ListUserRolesResponse,
  RevokeUserRoleResponse,
} from '@app/contracts';
import { UserRepository } from '../../repositories/user.repository';
import { RoleRepository } from '../../repositories/role.repository';
import { UserRoleRepository } from '../../repositories/user-role.repository';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { IamAdminPolicyService } from './iam-admin-policy.service';
import { lockLastActiveAdmin } from './last-active-admin.lock';

@Injectable()
export class UserRoleAdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly userRoles: UserRoleRepository,
    private readonly policy: IamAdminPolicyService,
    private readonly prisma: PrismaService,
  ) {}

  async listUserRoles(userId: string): Promise<ListUserRolesResponse> {
    const user = await this.users.findById(userId);
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const assignments =
      await this.userRoles.findOpenAssignmentsWithRoleByUserId(userId);
    return {
      assignments: assignments.map((assignment) => ({
        assignmentId: assignment.id,
        roleCode: assignment.role.code,
        roleName: assignment.role.name,
        assignedAt: assignment.assignedAt.toISOString(),
      })),
    };
  }

  async assignUserRole(input: {
    userId: string;
    roleCode: string;
    assignedByUserId: string;
  }): Promise<AssignUserRoleResponse> {
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const role = await this.roles.findByCode(input.roleCode);
    if (role === null || !role.isActive) {
      throw new NotFoundException('Role not found');
    }
    const existing = await this.userRoles.findActiveByUserAndRole(
      input.userId,
      role.id,
    );
    if (existing !== null) {
      throw new ConflictException('Active role assignment already exists');
    }

    try {
      const created = await this.userRoles.assign({
        userId: input.userId,
        roleId: role.id,
        assignedByUserId: input.assignedByUserId,
      });
      return {
        assignmentId: created.id,
        roleCode: role.code,
        assignedAt: created.assignedAt.toISOString(),
      };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Active role assignment already exists');
      }
      throw error;
    }
  }

  async revokeUserRole(input: {
    userId: string;
    roleCode: string;
    reason?: string;
    actorUserId: string;
  }): Promise<RevokeUserRoleResponse> {
    this.policy.assertNotSelfAdminRevoke(
      input.actorUserId,
      input.userId,
      input.roleCode,
    );
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new NotFoundException('User not found');
    }
    const role = await this.roles.findByCode(input.roleCode);
    if (role === null) {
      throw new NotFoundException('Role not found');
    }
    const assignment = await this.userRoles.findActiveByUserAndRole(
      input.userId,
      role.id,
    );
    if (assignment === null) {
      throw new ConflictException('No active role assignment');
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const enforceLastAdmin = input.roleCode === 'ADMIN';
      if (enforceLastAdmin) {
        await lockLastActiveAdmin(tx);
        await this.policy.assertCanRemoveActiveAdminFromUser(input.userId, tx);
      }
      const current = await tx.userRole.findFirst({
        where: {
          id: assignment.id,
          revokedAt: null,
        },
      });
      if (current === null) {
        throw new ConflictException('No active role assignment');
      }
      const updated = await tx.userRole.update({
        where: { id: current.id },
        data: {
          revokedAt: new Date(),
          revokeReason: input.reason ?? null,
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          userId: updated.userId,
          action: 'role_revoked',
          outcome: 'success',
          metadata: { roleId: updated.roleId },
        },
      });
      return updated;
    });
    return {
      assignmentId: revoked.id,
      roleCode: role.code,
      revokedAt: revoked.revokedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
