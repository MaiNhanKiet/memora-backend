import type { GemstoneSelectionItem } from '@app/contracts';

export const CART_REPOSITORY = Symbol('CART_REPOSITORY');

export interface CartActor {
  readonly userId?: string;
  readonly guestSessionId?: string;
}

export interface CartDraftVariantInfo {
  readonly standardSize: number;
  readonly materialName: string;
  readonly templateCode: string;
  readonly templateName: string;
}

export interface CartDraftRecord {
  readonly id: string;
  readonly cartId?: string;
  readonly ownerUserId?: string;
  readonly guestSessionId?: string;
  readonly cartOwnerUserId?: string;
  readonly cartGuestSessionId?: string;
  readonly templateVariantId: string;
  readonly targetSize: number;
  readonly personalizationPackage: string;
  readonly memoryEnabled: boolean;
  readonly gemstoneConfigJson: unknown;
  readonly estimatedPrice: number;
  readonly currency: string;
  readonly estimatedPriceAt?: Date;
  readonly status: string;
  readonly createdAt: Date;
  readonly variant?: CartDraftVariantInfo;
}

export interface CartRecord {
  readonly id: string;
  readonly userId?: string;
  readonly guestSessionId?: string;
  readonly status: string;
  readonly expiresAt?: Date;
  readonly drafts: readonly CartDraftRecord[];
}

export interface DesignShareCodeRecord {
  readonly id: string;
  readonly ringDesignDraftId: string;
  readonly status: string;
  readonly expiresAt: Date;
}

export interface CreateCartDraftInput {
  readonly cartId: string;
  readonly ownerUserId?: string;
  readonly guestSessionId?: string;
  readonly templateVariantId: string;
  readonly targetSize: number;
  readonly gemstoneConfigJson: object;
  readonly personalizationPackage: string;
  readonly memoryEnabled: boolean;
  readonly estimatedPrice: number;
  readonly currency: string;
}

export interface UpdateCartDraftInput {
  readonly targetSize?: number;
  readonly personalizationPackage?: string;
  readonly memoryEnabled?: boolean;
  readonly estimatedPrice?: number;
  readonly estimatedPriceAt?: Date;
  readonly gemstoneConfigJson?: object;
}

export type ValidatedGemstoneSelection = {
  readonly slotId: string;
  readonly optionId: string;
} & (
  | { readonly certifiedGemstoneId?: undefined }
  | {
      readonly certifiedGemstoneId: string;
      readonly priceVersionId: string;
      readonly certifiedPrice: number;
    }
);

export interface CartRepository {
  validateGemstoneSelections(
    variantId: string,
    selections: readonly GemstoneSelectionItem[],
  ): Promise<ValidatedGemstoneSelection[]>;
  findActiveCartByActor(actor: CartActor): Promise<CartRecord | undefined>;
  createActiveCart(data: {
    userId?: string;
    guestSessionId?: string;
    expiresAt?: Date;
  }): Promise<CartRecord>;
  findDraftById(draftId: string): Promise<CartDraftRecord | undefined>;
  createDraft(data: CreateCartDraftInput): Promise<CartDraftRecord>;
  updateDraft(
    draftId: string,
    data: UpdateCartDraftInput,
  ): Promise<CartDraftRecord>;
  deleteDraft(draftId: string): Promise<void>;
  updateCartStatus(cartId: string, status: string): Promise<void>;
  createDesignShareCode(params: {
    draftId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<DesignShareCodeRecord>;
  findDesignCodeById(
    linkId: string,
    draftId: string,
  ): Promise<DesignShareCodeRecord | undefined>;
  revokeDesignShareCode(linkId: string): Promise<void>;
}

const GUEST_CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function ensureActiveCart(
  repository: CartRepository,
  actor: CartActor,
): Promise<CartRecord> {
  const existing = await repository.findActiveCartByActor(actor);
  if (existing) {
    return existing;
  }

  const expiresAt = actor.guestSessionId
    ? new Date(Date.now() + GUEST_CART_TTL_MS)
    : undefined;

  return repository.createActiveCart({
    userId: actor.userId,
    guestSessionId: actor.guestSessionId,
    expiresAt,
  });
}
