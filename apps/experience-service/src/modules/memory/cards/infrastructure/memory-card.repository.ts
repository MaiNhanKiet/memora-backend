import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { memory_cards } from '../../../../../generated/prisma/client';

@Injectable()
export class MemoryCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCardsByOwner(
    ownerCustomerIdentityId: string,
    skip: number,
    take: number,
  ): Promise<{ items: memory_cards[]; total: number }> {
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

    return { items, total };
  }

  async findById(cardId: string): Promise<memory_cards | null> {
    return this.prisma.memory_cards.findFirst({
      where: {
        id: cardId,
        deleted_at: null,
      },
      include: {
        access_grants: true,
      },
    });
  }

  async findByRingItemId(ringItemId: string): Promise<memory_cards | null> {
    return this.prisma.memory_cards.findFirst({
      where: {
        ring_item_id: ringItemId,
        deleted_at: null,
      },
    });
  }

  async provisionCard(data: {
    ringItemId: string;
    ownerCustomerIdentityId: string;
    ownerEmail: string;
  }): Promise<memory_cards> {
    const existing = await this.findByRingItemId(data.ringItemId);
    if (existing) {
      return existing;
    }
    const now = new Date();
    return this.prisma.memory_cards.create({
      data: {
        ring_item_id: data.ringItemId,
        owner_customer_identity_id: data.ownerCustomerIdentityId,
        owner_email: data.ownerEmail,
        status: 'PENDING',
        created_at: now,
        updated_at: now,
      },
    });
  }

  async activateCard(
    cardId: string,
    initialPinHash?: string,
  ): Promise<memory_cards> {
    const now = new Date();
    return this.prisma.memory_cards.update({
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
  }

  async updatePin(cardId: string, pinHash: string): Promise<memory_cards> {
    const now = new Date();
    return this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_hash: pinHash,
        pin_updated_at: now,
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: now,
      },
    });
  }

  async recordFailedPinAttempt(
    cardId: string,
    newFailedAttempts: number,
    lockedUntil?: Date | null,
  ): Promise<memory_cards> {
    return this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_failed_attempts: newFailedAttempts,
        pin_locked_until: lockedUntil ?? null,
        updated_at: new Date(),
      },
    });
  }

  async resetFailedPinAttempts(cardId: string): Promise<memory_cards> {
    return this.prisma.memory_cards.update({
      where: { id: cardId },
      data: {
        pin_failed_attempts: 0,
        pin_locked_until: null,
        updated_at: new Date(),
      },
    });
  }
}
