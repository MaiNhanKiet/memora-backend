import { Injectable } from '@nestjs/common';
import { Prisma, type User } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByGoogleSub(googleSub: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleSub },
    });
  }

  create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  createWithRoleAssignment(
    data: Prisma.UserUncheckedCreateInput,
    roleId: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId,
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          userId: user.id,
          action: 'role_assigned',
          outcome: 'success',
          metadata: { roleId },
        },
      });
      return user;
    });
  }

  async deleteWithAssignments(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.securityAuditEvent.deleteMany({ where: { userId: id } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });
  }

  updateById(id: string, data: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  attachGoogleAccount(
    userId: string,
    googleSub: string,
    emailDiffers: boolean,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          googleSub,
          authProvider: 'HYBRID',
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          userId,
          action: 'google_account_linked',
          outcome: 'success',
          metadata: { emailDiffers },
        },
      });
      return user;
    });
  }

  detachGoogleAccount(userId: string): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          googleSub: null,
          authProvider: 'LOCAL',
        },
      });
      await tx.securityAuditEvent.create({
        data: {
          userId,
          action: 'google_account_unlinked',
          outcome: 'success',
          metadata: {},
        },
      });
      return user;
    });
  }
}
