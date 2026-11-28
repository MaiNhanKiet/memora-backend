import type { ParsedVerifiedActor } from '@app/common';
import type {
  MemoryCardDetailResponse,
  MemoryCardStatus,
  MemoryCardSummary,
} from '@app/contracts';
import type {
  MemoryCardRecord,
  MemoryCardWithGrantsRecord,
} from './memory-card.repository';

export function isCardPinLocked(
  card: { readonly pinLockedUntil?: Date },
  now: Date = new Date(),
): boolean {
  return Boolean(card.pinLockedUntil) && card.pinLockedUntil! > now;
}

export function hasCardOwnerOrGrantAccess(
  card: MemoryCardWithGrantsRecord,
  actor: ParsedVerifiedActor,
  customerIdentityId: string,
): boolean {
  if (card.ownerCustomerIdentityId === customerIdentityId) {
    return true;
  }
  return card.accessGrants.some(
    (g) =>
      g.status === 'ACTIVE' &&
      actor.kind === 'USER' &&
      g.granteeUserId === actor.userId,
  );
}

export function toMemoryCardSummary(
  card: MemoryCardRecord,
  now: Date = new Date(),
): MemoryCardSummary {
  return {
    id: card.id,
    ringItemId: card.ringItemId,
    ownerCustomerIdentityId: card.ownerCustomerIdentityId,
    ownerEmail: card.ownerEmail,
    status: card.status as MemoryCardStatus,
    hasPin: Boolean(card.pinHash),
    isLocked: isCardPinLocked(card, now),
    lockedUntil: card.pinLockedUntil?.toISOString(),
    activatedAt: card.activatedAt?.toISOString(),
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  };
}

export function toMemoryCardDetail(
  card: MemoryCardRecord,
  isOwner: boolean,
  now: Date = new Date(),
): MemoryCardDetailResponse {
  return {
    id: card.id,
    ringItemId: card.ringItemId,
    ownerCustomerIdentityId: card.ownerCustomerIdentityId,
    ownerEmail: card.ownerEmail,
    status: card.status as MemoryCardStatus,
    hasPin: Boolean(card.pinHash),
    isLocked: isCardPinLocked(card, now),
    pinFailedAttempts: card.pinFailedAttempts,
    pinLockedUntil: card.pinLockedUntil?.toISOString(),
    activatedAt: card.activatedAt?.toISOString(),
    arTargetAssetKey: card.arTargetAssetKey,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
    isOwner,
  };
}
