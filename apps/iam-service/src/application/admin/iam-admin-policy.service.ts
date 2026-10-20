import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';

const ACTIVE_USER_STATUS = 'ACTIVE';
const ADMIN_ROLE_CODE = 'ADMIN';

@Injectable()
export class IamAdminPolicyService {
  assertNotSelfAdminRevoke(
    actorUserId: string,
    targetUserId: string,
    roleCode: string,
  ): void {
    if (roleCode === 'ADMIN' && actorUserId === targetUserId) {
      throw new ForbiddenException();
    }
  }

  /**
   * Call only inside the transaction that already holds `lockLastActiveAdmin`
   * and that will apply the revoke or status change.
   */
  async assertCanRemoveActiveAdminFromUser(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const assignment = await tx.userRole.findFirst({
      where: {
        userId,
        revokedAt: null,
        role: { code: ADMIN_ROLE_CODE, isActive: true },
      },
      select: { id: true },
    });
    if (assignment === null) {
      return;
    }

    const activeAdmins = await tx.user.count({
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
    if (activeAdmins <= 1) {
      throw new ForbiddenException();
    }
  }
}
