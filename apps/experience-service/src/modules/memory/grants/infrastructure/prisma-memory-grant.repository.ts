import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  access_grants,
  memory_cards,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { MemoryCardRecord } from '../../cards/application/memory-card.repository';
import type {
  CreateMemoryGrantInput,
  MemoryAccessGrantRecord,
  MemoryAccessGrantWithCardRecord,
  MemoryGrantRepository,
} from '../application/memory-grant.repository';

type AccessGrantWithCardRow = Prisma.access_grantsGetPayload<{
  include: { memory_cards: true };
}>;

function toMemoryCardRecord(row: memory_cards): MemoryCardRecord {
  return {
    id: row.id,
    ringItemId: row.ring_item_id,
    ownerCustomerIdentityId: row.owner_customer_identity_id,
    ownerEmail: row.owner_email,
    status: row.status,
    activatedAt: row.activated_at ?? undefined,
    pinHash: row.pin_hash ?? undefined,
    pinFailedAttempts: row.pin_failed_attempts,
    pinLockedUntil: row.pin_locked_until ?? undefined,
    pinUpdatedAt: row.pin_updated_at ?? undefined,
    arTargetAssetKey: row.ar_target_asset_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function toMemoryAccessGrantRecord(
  row: access_grants,
): MemoryAccessGrantRecord {
  return {
    id: row.id,
    memoryCardId: row.memory_card_id,
    granteeEmail: row.grantee_email,
    granteeUserId: row.grantee_user_id ?? undefined,
    status: row.status,
    inviteExpiresAt: row.invite_expires_at ?? undefined,
    acceptedAt: row.accepted_at ?? undefined,
    lastAccessedAt: row.last_accessed_at ?? undefined,
    createdAt: row.created_at,
  };
}

function toMemoryAccessGrantWithCardRecord(
  row: AccessGrantWithCardRow,
): MemoryAccessGrantWithCardRecord {
  return {
    ...toMemoryAccessGrantRecord(row),
    card: row.memory_cards ? toMemoryCardRecord(row.memory_cards) : undefined,
  };
}

@Injectable()
export class PrismaMemoryGrantRepository implements MemoryGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createGrant(
    data: CreateMemoryGrantInput,
  ): Promise<MemoryAccessGrantRecord> {
    const created = await this.prisma.access_grants.create({
      data: {
        memory_card_id: data.memoryCardId,
        grantee_email: data.granteeEmail.toLowerCase(),
        invitation_token_hash: data.invitationTokenHash,
        invite_expires_at: data.inviteExpiresAt,
        status: 'PENDING',
      },
    });
    return toMemoryAccessGrantRecord(created);
  }

  async listGrantsByCardId(
    cardId: string,
  ): Promise<readonly MemoryAccessGrantRecord[]> {
    const rows = await this.prisma.access_grants.findMany({
      where: {
        memory_card_id: cardId,
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map(toMemoryAccessGrantRecord);
  }

  async findGrantById(
    grantId: string,
  ): Promise<MemoryAccessGrantWithCardRecord | undefined> {
    const row = await this.prisma.access_grants.findUnique({
      where: { id: grantId },
      include: {
        memory_cards: true,
      },
    });
    return row ? toMemoryAccessGrantWithCardRecord(row) : undefined;
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<MemoryAccessGrantWithCardRecord | undefined> {
    const row = await this.prisma.access_grants.findFirst({
      where: {
        invitation_token_hash: tokenHash,
      },
      include: {
        memory_cards: true,
      },
    });
    return row ? toMemoryAccessGrantWithCardRecord(row) : undefined;
  }

  async revokeGrant(
    grantId: string,
    revokedByUserId?: string,
  ): Promise<MemoryAccessGrantRecord> {
    const updated = await this.prisma.access_grants.update({
      where: { id: grantId },
      data: {
        status: 'REVOKED',
        revoked_at: new Date(),
        revoked_by_user_id: revokedByUserId ?? null,
      },
    });
    return toMemoryAccessGrantRecord(updated);
  }

  async markAccepted(
    grantId: string,
    userId?: string,
  ): Promise<MemoryAccessGrantRecord> {
    const updated = await this.prisma.access_grants.update({
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
    return toMemoryAccessGrantRecord(updated);
  }

  async updateLastAccessed(grantId: string): Promise<MemoryAccessGrantRecord> {
    const updated = await this.prisma.access_grants.update({
      where: { id: grantId },
      data: {
        last_accessed_at: new Date(),
      },
    });
    return toMemoryAccessGrantRecord(updated);
  }
}
