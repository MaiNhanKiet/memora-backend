import { Injectable } from '@nestjs/common';
import { Prisma, type UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

const ACTIVE_USER_STATUS = 'ACTIVE';
const ADMIN_ROLE_CODE = 'ADMIN';

export type UserRoleWithRole = Prisma.UserRoleGetPayload<{
  include: { role: true };
}>;

@Injectable()
export class UserRoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUserId(userId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: { assignedAt: 'asc' },
    });
  }

  findActiveWithRoleByUserId(userId: string): Promise<UserRoleWithRole[]> {
    return this.prisma.userRole.findMany({
      where: {
        userId,
        revokedAt: null,
        role: { isActive: true },
      },
      include: { role: true },
      orderBy: { assignedAt: 'asc' },
    });
  }

  /** Open assignments, including a role that is no longer active. */
  findOpenAssignmentsWithRoleByUserId(
    userId: string,
  ): Promise<UserRoleWithRole[]> {
    return this.prisma.userRole.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      include: { role: true },
      orderBy: { assignedAt: 'asc' },
    });
  }

  findHistoryByUserId(userId: string): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: { userId },
      orderBy: { assignedAt: 'desc' },
    });
  }

  countActiveAdminUsers(): Promise<number> {
    return this.prisma.user.count({
      where: {
        status: ACTIVE_USER_STATUS,
        userRoles: {
          some: {
            revokedAt: null,
            role: { code: ADMIN_ROLE_CODE, isActive: true },
          },
        },
      },
    });
  }

  userHasActiveAdminRole(userId: string): Promise<boolean> {
    return this.prisma.userRole
      .findFirst({
        where: {
          userId,
          revokedAt: null,
          role: { code: ADMIN_ROLE_CODE, isActive: true },
        },
        select: { id: true },
      })
      .then((row) => row !== null);
  }

  findActiveByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<UserRole | null> {
    return this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        revokedAt: null,
      },
    });
  }

  assign(data: Prisma.UserRoleUncheckedCreateInput): Promise<UserRole> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.userRole.create({ data });
      await tx.securityAuditEvent.create({
        data: {
          userId: created.userId,
          action: 'role_assigned',
          outcome: 'success',
          metadata: { roleId: created.roleId },
        },
      });
      return created;
    });
  }

  revoke(id: string, revokeReason?: string): Promise<UserRole> {
    return this.prisma.$transaction(async (tx) => {
      const revoked = await tx.userRole.update({
        where: { id },
        data: {
          revokedAt: new Date(),
          revokeReason: revokeReason ?? null,
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          userId: revoked.userId,
          action: 'role_revoked',
          outcome: 'success',
          metadata: { roleId: revoked.roleId },
        },
      });
      return revoked;
    });
  }
}
