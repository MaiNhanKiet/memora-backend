import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  access_grants,
  memory_cards,
} from '../../../../../generated/prisma/client';

export type AccessGrantWithCard = access_grants & {
  memory_cards?: memory_cards | null;
};

@Injectable()
export class MemoryGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGrant(data: {
    memoryCardId: string;
    granteeEmail: string;
    invitationTokenHash: string;
    inviteExpiresAt: Date;
  }): Promise<access_grants> {
    return this.prisma.access_grants.create({
      data: {
        memory_card_id: data.memoryCardId,
        grantee_email: data.granteeEmail.toLowerCase(),
        invitation_token_hash: data.invitationTokenHash,
        invite_expires_at: data.inviteExpiresAt,
        status: 'PENDING',
      },
    });
  }

  async listGrantsByCardId(cardId: string): Promise<access_grants[]> {
    return this.prisma.access_grants.findMany({
      where: {
        memory_card_id: cardId,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findGrantById(grantId: string): Promise<AccessGrantWithCard | null> {
    return this.prisma.access_grants.findUnique({
      where: { id: grantId },
      include: {
        memory_cards: true,
      },
    });
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<AccessGrantWithCard | null> {
    return this.prisma.access_grants.findFirst({
      where: {
        invitation_token_hash: tokenHash,
      },
      include: {
        memory_cards: true,
      },
    });
  }

  async revokeGrant(
    grantId: string,
    revokedByUserId?: string,
  ): Promise<access_grants> {
    return this.prisma.access_grants.update({
      where: { id: grantId },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
        revoked_by_user_id: revokedByUserId ?? null,
      },
    });
  }

  async markAccepted(
    grantId: string,
    userId?: string,
  ): Promise<access_grants> {
    return this.prisma.access_grants.update({
      where: { id: grantId },
      data: {
        status: 'ACTIVE',
        accepted_at: new Date(),
        ...(userId
          ? {
              grantee_user_id: userId,
              linked_to_account_at: new Date(),
            }
          : {}),
      },
    });
  }

  async updateLastAccessed(grantId: string): Promise<access_grants> {
    return this.prisma.access_grants.update({
      where: { id: grantId },
      data: {
        last_accessed_at: new Date(),
      },
    });
  }
}
