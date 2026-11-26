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
  PinVerificationInput,
  PinVerificationResult,
  ProvisionMemoryCardInput,
} from '../application/memory-card.repository';

type MemoryCardWithGrantsRow = Prisma.memory_cardsGetPayload<{
  include: { access_grants: true };
}>;

type MemoryCardPinRow = Pick<
  memory_cards,
  'pin_hash' | 'pin_failed_attempts' | 'pin_locked_until'
>;

function pinUpdateData(pinHash: string, now: Date) {
  return {
    pin_hash: pinHash,
    pin_updated_at: now,
    pin_failed_attempts: 0,
    pin_locked_until: null,
    updated_at: now,
  };
}

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
      data: pinUpdateData(pinHash, now),
    });
    return toMemoryCardRecord(updated);
  }

  async changeVerifiedPin(
    cardId: string,
    expectedPinHash: string,
    newPinHash: string,
  ): Promise<MemoryCardRecord | undefined> {
    const now = new Date();
    const [updated] = await this.prisma.memory_cards.updateManyAndReturn({
      where: {
        id: cardId,
        deleted_at: null,
        pin_hash: expectedPinHash,
        OR: [{ pin_locked_until: null }, { pin_locked_until: { lte: now } }],
      },
      data: pinUpdateData(newPinHash, now),
    });
    return updated ? toMemoryCardRecord(updated) : undefined;
  }

  async applyPinVerification(
    input: PinVerificationInput,
  ): Promise<PinVerificationResult> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize attempts on this card and recheck the hash after PIN verification.
      const [card] = await tx.$queryRaw<MemoryCardPinRow[]>`
        SELECT pin_hash, pin_failed_attempts, pin_locked_until
        FROM memory.memory_cards
        WHERE id = ${input.cardId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!card || card.pin_hash !== input.expectedPinHash) {
        return { kind: 'stale' };
      }

      const now = new Date();
      const currentLock = card.pin_locked_until;
      if (currentLock && currentLock > now) {
        return { kind: 'locked', lockedUntil: currentLock };
      }

      const failedAttempts = input.matches
        ? 0
        : (currentLock ? 0 : card.pin_failed_attempts) + 1;
      const lockedUntil =
        failedAttempts >= input.maxFailedAttempts
          ? new Date(now.getTime() + input.lockDurationMs)
          : null;
      if (failedAttempts !== card.pin_failed_attempts || currentLock) {
        await tx.memory_cards.update({
          where: { id: input.cardId },
          data: {
            pin_failed_attempts: failedAttempts,
            pin_locked_until: lockedUntil,
            updated_at: now,
          },
        });
      }
      return input.matches
        ? { kind: 'verified' }
        : { kind: 'invalid', failedAttempts };
    });
  }
}
