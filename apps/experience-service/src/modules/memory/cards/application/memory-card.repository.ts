export const MEMORY_CARD_REPOSITORY = Symbol('MEMORY_CARD_REPOSITORY');

export interface MemoryCardAccessGrantRecord {
  readonly id: string;
  readonly status: string;
  readonly granteeUserId?: string;
}

export interface MemoryCardRecord {
  readonly id: string;
  readonly ringItemId: string;
  readonly ownerCustomerIdentityId: string;
  readonly ownerEmail: string;
  readonly status: string;
  readonly activatedAt?: Date;
  readonly pinHash?: string;
  readonly pinFailedAttempts: number;
  readonly pinLockedUntil?: Date;
  readonly pinUpdatedAt?: Date;
  readonly arTargetAssetKey?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deletedAt?: Date;
}

export interface MemoryCardWithGrantsRecord extends MemoryCardRecord {
  readonly accessGrants: readonly MemoryCardAccessGrantRecord[];
}

export interface ProvisionMemoryCardInput {
  readonly ringItemId: string;
  readonly ownerCustomerIdentityId: string;
  readonly ownerEmail: string;
}

export interface PinVerificationInput {
  readonly cardId: string;
  readonly expectedPinHash: string;
  readonly matches: boolean;
  readonly maxFailedAttempts: number;
  readonly lockDurationMs: number;
}

export type PinVerificationResult =
  | { readonly kind: 'verified' }
  | { readonly kind: 'invalid'; readonly failedAttempts: number }
  | { readonly kind: 'locked'; readonly lockedUntil: Date }
  | { readonly kind: 'stale' };

export interface MemoryCardRepository {
  listCardsByOwner(
    ownerCustomerIdentityId: string,
    skip: number,
    take: number,
  ): Promise<{
    readonly items: readonly MemoryCardRecord[];
    readonly total: number;
  }>;
  findById(cardId: string): Promise<MemoryCardWithGrantsRecord | undefined>;
  findByRingItemId(ringItemId: string): Promise<MemoryCardRecord | undefined>;
  provisionCard(data: ProvisionMemoryCardInput): Promise<MemoryCardRecord>;
  activateCard(
    cardId: string,
    initialPinHash?: string,
  ): Promise<MemoryCardRecord | undefined>;
  updatePin(cardId: string, pinHash: string): Promise<MemoryCardRecord>;
  changeVerifiedPin(
    cardId: string,
    expectedPinHash: string,
    newPinHash: string,
  ): Promise<MemoryCardRecord | undefined>;
  applyPinVerification(
    input: PinVerificationInput,
  ): Promise<PinVerificationResult>;
}
