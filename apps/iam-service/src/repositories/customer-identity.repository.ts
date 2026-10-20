import { Injectable } from '@nestjs/common';
import { Prisma, type CustomerIdentity } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

export type LinkGuestIdentityResult =
  | { kind: 'linked'; identity: CustomerIdentity }
  | { kind: 'missing' }
  | { kind: 'unverified' }
  | { kind: 'already_linked' }
  | { kind: 'primary_conflict' };

@Injectable()
export class CustomerIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<CustomerIdentity | null> {
    return this.prisma.customerIdentity.findUnique({
      where: { id },
    });
  }

  findByUserId(userId: string): Promise<CustomerIdentity[]> {
    return this.prisma.customerIdentity.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findPrimaryByUserId(userId: string): Promise<CustomerIdentity | null> {
    return this.prisma.customerIdentity.findFirst({
      where: {
        userId,
        isPrimaryForUser: true,
      },
    });
  }

  create(
    data: Prisma.CustomerIdentityUncheckedCreateInput,
  ): Promise<CustomerIdentity> {
    return this.prisma.customerIdentity.create({ data });
  }

  async linkVerifiedGuestAsPrimary(
    identityId: string,
    userId: string,
    audit: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<LinkGuestIdentityResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const primary = await tx.customerIdentity.findFirst({
          where: { userId, isPrimaryForUser: true },
        });
        if (primary !== null) {
          return { kind: 'primary_conflict' };
        }
        const current = await tx.customerIdentity.findUnique({
          where: { id: identityId },
        });
        if (current === null) {
          return { kind: 'missing' };
        }
        if (current.emailVerifiedAt === null) {
          return { kind: 'unverified' };
        }
        if (current.userId !== null) {
          return { kind: 'already_linked' };
        }
        const claimed = await tx.customerIdentity.updateMany({
          where: {
            id: identityId,
            userId: null,
            emailVerifiedAt: { not: null },
          },
          data: {
            userId,
            isPrimaryForUser: true,
            accountLinkedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          const again = await tx.customerIdentity.findUnique({
            where: { id: identityId },
          });
          if (again === null) {
            return { kind: 'missing' };
          }
          if (again.userId !== null) {
            return { kind: 'already_linked' };
          }
          return { kind: 'primary_conflict' };
        }
        const linked = await tx.customerIdentity.findUnique({
          where: { id: identityId },
        });
        if (linked === null || linked.accountLinkedAt === null) {
          return { kind: 'missing' };
        }
        await audit(tx);
        return { kind: 'linked', identity: linked };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { kind: 'primary_conflict' };
      }
      throw error;
    }
  }

  updateById(
    id: string,
    data: Prisma.CustomerIdentityUncheckedUpdateInput,
  ): Promise<CustomerIdentity> {
    return this.prisma.customerIdentity.update({
      where: { id },
      data,
    });
  }
}
