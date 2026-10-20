import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  computeTotalPages,
  getPaginationOffset,
  normalizePagination,
} from '@app/common';
import type {
  ListUsersResponse,
  ProvisionUserResponse,
  UpdateUserStatusResponse,
} from '@app/contracts';
import { AuthenticationService } from '../auth/authentication.service';
import { PasswordHasher } from '../auth/password-hasher';
import {
  SECURITY_AUDIT_ACTION,
  securityAuditData,
} from '../auth/security-audit';
import { USER_STATUS, type UserStatus } from '../constants/iam-status';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { UserRepository } from '../../repositories/user.repository';
import { RoleRepository } from '../../repositories/role.repository';
import { toPublicUser } from '../users/users.mapper';
import { toPublicUserMessage } from './admin-message.mapper';
import { IamAdminPolicyService } from './iam-admin-policy.service';
import { lockLastActiveAdmin } from './last-active-admin.lock';
import { randomBytes } from 'node:crypto';

@Injectable()
export class UserAdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly authentication: AuthenticationService,
    private readonly passwordHasher: PasswordHasher,
    private readonly policy: IamAdminPolicyService,
    private readonly prisma: PrismaService,
  ) {}

  async listUsers(input: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ListUsersResponse> {
    const status = parseOptionalUserStatus(input.status);
    const { page, limit } = normalizePagination(input);
    const { skip, take } = getPaginationOffset(page, limit);
    const { rows, total } = await this.users.findManyPaginated({
      ...(status === undefined ? {} : { status }),
      skip,
      take,
    });
    return {
      users: rows.map((user) => toPublicUserMessage(toPublicUser(user))),
      pagination: {
        page,
        limit,
        total,
        totalPages: computeTotalPages(total, limit),
      },
    };
  }

  async updateUserStatus(input: {
    userId: string;
    status: string;
    actorUserId: string;
  }): Promise<UpdateUserStatusResponse> {
    const nextStatus = parseRequiredUserStatus(input.status);
    const user = await this.users.findById(input.userId);
    if (user === null) {
      throw new NotFoundException('User not found');
    }

    const removesSession =
      nextStatus === USER_STATUS.LOCKED || nextStatus === USER_STATUS.DISABLED;

    if (user.status !== nextStatus) {
      await this.prisma.$transaction(async (tx) => {
        if (removesSession) {
          await lockLastActiveAdmin(tx);
          await this.policy.assertCanRemoveActiveAdminFromUser(user.id, tx);
        }
        const current = await tx.user.findUnique({ where: { id: user.id } });
        if (current === null) {
          throw new NotFoundException('User not found');
        }
        if (current.status === nextStatus) {
          return;
        }
        await tx.user.update({
          where: { id: current.id },
          data: { status: nextStatus },
        });
        await tx.securityAuditEvent.create({
          data: securityAuditData({
            userId: current.id,
            action: SECURITY_AUDIT_ACTION.USER_STATUS_CHANGED,
            metadata: {
              previousStatus: current.status,
              nextStatus,
              actorUserId: input.actorUserId,
            },
          }),
        });
      });
    }

    if (removesSession) {
      await this.authentication.logoutAll(user.id);
    }

    return { userId: user.id, status: nextStatus };
  }

  async provisionUser(input: {
    email: string;
    fullName: string;
    roleCode: string;
    createdByUserId: string;
  }): Promise<ProvisionUserResponse> {
    if (input.roleCode === 'CUSTOMER') {
      throw new BadRequestException('Role code is invalid');
    }
    const role = await this.roles.findByCode(input.roleCode);
    if (role === null || !role.isActive) {
      throw new NotFoundException('Role not found');
    }
    const existing = await this.users.findByEmail(input.email);
    if (existing !== null) {
      throw new ConflictException('Email already in use');
    }

    const initialPassword = generateInitialPassword();
    const passwordHash = await this.passwordHasher.hash(initialPassword);

    try {
      const created = await this.users.provisionLocalUserWithRole({
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        createdByUserId: input.createdByUserId,
        roleId: role.id,
      });

      return {
        userId: created.id,
        email: created.email,
        status: created.status,
        roleCode: role.code,
        initialPassword,
      };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }
}

function parseOptionalUserStatus(
  value: string | undefined,
): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  return parseRequiredUserStatus(value);
}

function parseRequiredUserStatus(value: string): UserStatus {
  const normalized = value.trim();
  if (
    normalized !== USER_STATUS.ACTIVE &&
    normalized !== USER_STATUS.LOCKED &&
    normalized !== USER_STATUS.DISABLED
  ) {
    throw new BadRequestException('Status is invalid');
  }
  return normalized;
}

function generateInitialPassword(): string {
  return randomBytes(18).toString('base64url');
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
