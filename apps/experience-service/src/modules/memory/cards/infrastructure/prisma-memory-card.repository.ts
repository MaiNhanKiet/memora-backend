import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  memory_cards,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  MemoryCardRecord,
  MemoryCardRepository,
  MemoryCardWithGrantsRecord,
  ProvisionMemoryCardInput,
} from '../application/memory-card.repository';

type MemoryCardWithGrantsRow = Prisma.memory_cardsGetPayload<{
  include: { access_grants: true };
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

function toMemoryCardWithGrantsRecord(
  row: MemoryCardWithGrantsRow,
): MemoryCardWithGrantsRecord {
  return {
    ...toMemoryCardRecord(row),
    accessGrants: row.access_grants.map((grant) => ({
      id: grant.id,
      status: grant.status,
      granteeUserId: grant.grantee_user_id ?? undefined,
    })),
  };
}

@Injectable()
export class PrismaMemoryCardRepository implements MemoryCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCardsByOwner(
    ownerCustomerIdentityId: string,
    skip: number,
    take: number,
  ): Promise<{
    readonly items: readonly MemoryCardRecord[];
    readonly total: number;
  }> {
    const where = {
      owner_customer_identity_id: ownerCustomerIdentityId,
      deleted_at: null,
    };

    const [items, total] = await Promise.all([
      this.prisma.memory_cards.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.memory_cards.count({ where }),
    ]);

    return { items: items.map(toMemoryCardRecord), total };
  }

  async findById(
    cardId: string,
  ): Promise<MemoryCardWithGrantsRecord | undefined> {
    const row = await this.prisma.memory_cards.findFirst({
      where: {
        id: cardId,
        deleted_at: null,
      },
      include: {
        access_grants: true,
      },
    });
    return row ? toMemoryCardWithGrantsRecord(row) : undefined;
  }

  async findByRingItemId(
    ringItemId: string,
  ): Promise<MemoryCardRecord | undefined> {
    const row = await this.prisma.memory_cards.findFirst({
      where: {
        ring_item_id: ringItemId,
        deleted_at: null,
      },
    });
    return row ? toMemoryCardRecord(row) : undefined;
  }

  async provisionCard(
    data: ProvisionMemoryCardInput,
  ): Promise<MemoryCardRecord> {
    const existing = await this.findByRingItemId(data.ringItemId);
    if (existing) {
      return existing;
    }
    const now = new Date();
    const created = await this.prisma.memory_cards.create({
      data: {
        ring_item_id: data.ringItemId,
        owner_customer_identity_id: data.ownerCustomerIdentityId,
        owner_email: data.ownerEmail,
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      },
    });
    return toMemoryCardRecord(created);
  }

  async activateCard(
    cardId: string,
    initialPinHash?: string,
  ): Promise<MemoryCardRecord> {
    const now = new Date();
    const updated = await this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        status: 'ACTIVE',
        activated_at: now,
        ...(initialPinHash
          ? {
              pin_hash: initialPinHash,
              pin_updated_at: now,
              pin_failed_attempts: 0,
              pin_locked_until: null,
            }
          : {}),
        updated_at: now,
      },
    });
    return toMemoryCardRecord(updated);
  }

  async updatePin(cardId: string, pinHash: string): Promise<MemoryCardRecord> {
    const now = new Date();
    const updated = await this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_hash: pinHash,
        pin_updated_at: now,
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: now,
      },
    });
    return toMemoryCardRecord(updated);
  }

  async recordFailedPinAttempt(
    cardId: string,
    newFailedAttempts: number,
    lockedUntil?: Date,
  ): Promise<MemoryCardRecord> {
    const updated = await this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_failed_attempts: newFailedAttempts,
        pin_locked_until: lockedUntil ?? null,
        updated_at: new Date(),
      },
    });
    return toMemoryCardRecord(updated);
  }

  async resetFailedPinAttempts(cardId: string): Promise<MemoryCardRecord> {
    const updated = await this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date(),
      },
    });
    return toMemoryCardRecord(updated);
  }
}
