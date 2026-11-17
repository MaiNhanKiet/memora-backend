import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { parseVerifiedActor, type ParsedVerifiedActor } from '@app/common';
import type {
  AbandonCartRequest,
  AbandonCartResponse,
  AddCartItemRequest,
  AddCartItemResponse,
  CartItemDraft,
  CreateDesignShareLinkRequest,
  CreateDesignShareLinkResponse,
  DuplicateDesignDraftRequest,
  DuplicateDesignDraftResponse,
  GemstoneSelectionItem,
  GetCartRequest,
  GetCartResponse,
  GetDesignDraftRequest,
  GetDesignDraftResponse,
  RemoveCartItemRequest,
  RemoveCartItemResponse,
  RevokeDesignShareLinkRequest,
  RevokeDesignShareLinkResponse,
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  ValidateCheckoutRequest,
  ValidateCheckoutResponse,
  VerifiedActor,
} from '@app/contracts';
import * as crypto from 'crypto';
import {
  CartRepository,
  type CartWithDrafts,
} from '../infrastructure/cart.repository';
import { PricingService } from '../../../pricing/pricing-core/application/pricing.service';

@Injectable()
export class CartService {
  constructor(
    private readonly repository: CartRepository,
    private readonly pricingService: PricingService,
  ) {}

  // ---------------------------------------------------------------------------
  // [DESIG-001] Get Cart
  // ---------------------------------------------------------------------------
  async getCart(request: GetCartRequest): Promise<GetCartResponse> {
    const actor = this.validateActor(request.actor);
    let cart = await this.repository.findActiveCartByActor(actor);

    if (!cart) {
      // Auto-provision empty active cart
      const expiresAt = actor.guestSessionId
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : undefined;

      await this.repository.createActiveCart({
        userId: actor.userId,
        guestSessionId: actor.guestSessionId,
        expiresAt,
      });

      cart = await this.repository.findActiveCartByActor(actor);
    }

    return this.mapCartResponse(cart!);
  }

  // ---------------------------------------------------------------------------
  // [DESIG-002] Add Cart Item
  // ---------------------------------------------------------------------------
  async addCartItem(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    const actor = this.validateActor(request.actor);
    let cart = await this.repository.findActiveCartByActor(actor);

    if (!cart) {
      const expiresAt = actor.guestSessionId
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : undefined;

      await this.repository.createActiveCart({
        userId: actor.userId,
        guestSessionId: actor.guestSessionId,
        expiresAt,
      });

      cart = await this.repository.findActiveCartByActor(actor);
    }

    // Call PricingService to calculate real-time estimated price
    const gemstoneOptionIds = (request.gemstoneSelections || []).map(
      (g) => g.gemstoneOptionId,
    );
    const pricing = await this.pricingService.estimatePrice({
      templateVariantId: request.templateVariantId,
      targetSize: request.targetSize,
      gemstoneOptionIds,
      personalizationPackage: request.personalizationPackage || 'NONE',
    });

    const draft = await this.repository.createDraft({
      cartId: cart!.id,
      ownerUserId: actor.userId,
      guestSessionId: actor.guestSessionId,
      templateVariantId: request.templateVariantId,
      targetSize: request.targetSize,
      gemstoneConfigJson: request.gemstoneSelections || [],
      personalizationPackage: request.personalizationPackage || 'NONE',
      memoryEnabled: request.memoryEnabled ?? false,
      estimatedPrice: pricing.estimatedTotal,
      currency: pricing.currency,
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    const mappedCart = this.mapCartResponse(updatedCart!);

    return {
      item: this.mapDraftItem(draft),
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-003] Update Cart Item
  // ---------------------------------------------------------------------------
  async updateCartItem(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse> {
    const actor = this.validateActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft || draft.status !== 'IN_CART') {
      throw new NotFoundException(`Draft ${request.draftId} not found in cart`);
    }

    this.assertOwnership(draft, actor);

    const targetSize = request.targetSize ?? Number(draft.target_size);
    const pkg = request.personalizationPackage ?? draft.personalization_package;
    const memoryEnabled = request.memoryEnabled ?? draft.memory_enabled;

    // Recalculate price if size or personalization changed
    const gemstoneSelections =
      (draft.gemstone_config_json as unknown as GemstoneSelectionItem[]) || [];
    const gemstoneOptionIds = gemstoneSelections.map((g) => g.gemstoneOptionId);

    const pricing = await this.pricingService.estimatePrice({
      templateVariantId: draft.template_variant_id,
      targetSize,
      gemstoneOptionIds,
      personalizationPackage: pkg,
    });

    const updated = await this.repository.updateDraft(draft.id, {
      targetSize,
      personalizationPackage: pkg,
      memoryEnabled,
      estimatedPrice: pricing.estimatedTotal,
      estimatedPriceAt: new Date(),
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    const mappedCart = this.mapCartResponse(updatedCart!);

    return {
      item: this.mapDraftItem(updated),
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-004] Remove Cart Item
  // ---------------------------------------------------------------------------
  async removeCartItem(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse> {
    const actor = this.validateActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft || draft.status !== 'IN_CART') {
      throw new NotFoundException(`Draft ${request.draftId} not found in cart`);
    }

    this.assertOwnership(draft, actor);

    await this.repository.deleteDraft(draft.id);

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    const mappedCart = this.mapCartResponse(updatedCart!);

    return {
      removedDraftId: draft.id,
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-005] Validate Checkout
  // ---------------------------------------------------------------------------
  async validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse> {
    const actor = this.validateActor(request.actor);
    const cart = await this.repository.findActiveCartByActor(actor);

    if (!cart || cart.ring_design_drafts.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const selectedDraftIds = request.selectedDraftIds || [];
    if (selectedDraftIds.length === 0) {
      throw new BadRequestException('At least one draft must be selected');
    }

    // BM04 constraint: each order supports 1-2 ring items
    if (selectedDraftIds.length > 2) {
      throw new BadRequestException(
        'A single order can contain at most 2 ring items (single or matching pair)',
      );
    }

    const issues: { draftId: string; code: string; message: string }[] = [];
    let totalEstimatedPrice = 0;

    for (const draftId of selectedDraftIds) {
      const draft = cart.ring_design_drafts.find((d) => d.id === draftId);
      if (!draft) {
        issues.push({
          draftId,
          code: 'DRAFT_NOT_IN_CART',
          message: `Draft ${draftId} does not belong to active cart`,
        });
        continue;
      }

      try {
        const gemstoneSelections =
          (draft.gemstone_config_json as unknown as GemstoneSelectionItem[]) ||
          [];
        const pricing = await this.pricingService.estimatePrice({
          templateVariantId: draft.template_variant_id,
          targetSize: Number(draft.target_size),
          gemstoneOptionIds: gemstoneSelections.map((g) => g.gemstoneOptionId),
          personalizationPackage: draft.personalization_package,
        });
        totalEstimatedPrice += pricing.estimatedTotal;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Validation failed';
        issues.push({
          draftId,
          code: 'REPRICING_FAILED',
          message,
        });
      }
    }

    return {
      isValid: issues.length === 0,
      totalEstimatedPrice,
      currency: 'VND',
      issues,
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-006] Abandon Cart
  // ---------------------------------------------------------------------------
  async abandonCart(request: AbandonCartRequest): Promise<AbandonCartResponse> {
    const actor = this.validateActor(request.actor);
    const cart = await this.repository.findActiveCartByActor(actor);

    if (!cart) {
      throw new NotFoundException('No active cart found for actor');
    }

    await this.repository.updateCartStatus(cart.id, 'ABANDONED');

    return {
      cartId: cart.id,
      status: 'ABANDONED',
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-007] Get Design Draft
  // ---------------------------------------------------------------------------
  async getDesignDraft(
    request: GetDesignDraftRequest,
  ): Promise<GetDesignDraftResponse> {
    const actor = this.validateActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft) {
      throw new NotFoundException(`Design draft ${request.draftId} not found`);
    }

    this.assertOwnership(draft, actor);

    return {
      draft: this.mapDraftItem(draft),
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-008] Duplicate Design Draft
  // ---------------------------------------------------------------------------
  async duplicateDesignDraft(
    request: DuplicateDesignDraftRequest,
  ): Promise<DuplicateDesignDraftResponse> {
    const actor = this.validateActor(request.actor);
    const sourceDraft = await this.repository.findDraftById(request.draftId);

    if (!sourceDraft) {
      throw new NotFoundException(`Design draft ${request.draftId} not found`);
    }

    this.assertOwnership(sourceDraft, actor);

    let cart = await this.repository.findActiveCartByActor(actor);
    if (!cart) {
      const expiresAt = actor.guestSessionId
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : undefined;

      await this.repository.createActiveCart({
        userId: actor.userId,
        guestSessionId: actor.guestSessionId,
        expiresAt,
      });

      cart = await this.repository.findActiveCartByActor(actor);
    }

    const gemstoneSelections =
      (sourceDraft.gemstone_config_json as unknown as GemstoneSelectionItem[]) ||
      [];
    const gemstoneOptionIds = gemstoneSelections.map((g) => g.gemstoneOptionId);
    const pricing = await this.pricingService.estimatePrice({
      templateVariantId: sourceDraft.template_variant_id,
      targetSize: Number(sourceDraft.target_size),
      gemstoneOptionIds,
      personalizationPackage: sourceDraft.personalization_package || 'NONE',
    });

    const newDraft = await this.repository.createDraft({
      cartId: cart!.id,
      ownerUserId: actor.userId,
      guestSessionId: actor.guestSessionId,
      templateVariantId: sourceDraft.template_variant_id,
      targetSize: Number(sourceDraft.target_size),
      gemstoneConfigJson: gemstoneSelections,
      personalizationPackage: sourceDraft.personalization_package,
      memoryEnabled: sourceDraft.memory_enabled,
      estimatedPrice: pricing.estimatedTotal,
      currency: pricing.currency,
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    const mappedCart = this.mapCartResponse(updatedCart!);

    return {
      draft: this.mapDraftItem(newDraft),
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private validateActor(actor?: VerifiedActor): {
    userId?: string;
    guestSessionId?: string;
  } {
    const parsed: ParsedVerifiedActor = parseVerifiedActor(actor);
    if (parsed.kind === 'USER') {
      return { userId: parsed.userId };
    }
    if (parsed.kind === 'GUEST_SESSION') {
      return { guestSessionId: parsed.guestSessionId };
    }
    // VERIFIED_GUEST: guest who has customerIdentityId but no userId/guestSessionId
    throw new BadRequestException('Unsupported actor kind for cart operations');
  }

  private assertOwnership(
    draft: {
      owner_user_id: string | null;
      guest_session_id: string | null;
      carts: { user_id: string | null; guest_session_id: string | null } | null;
    },
    actor: { userId?: string; guestSessionId?: string },
  ) {
    const cartOwnerUser = draft.carts?.user_id;
    const cartGuestSession = draft.carts?.guest_session_id;

    if (actor.userId && cartOwnerUser && actor.userId === cartOwnerUser) {
      return;
    }
    if (
      actor.guestSessionId &&
      cartGuestSession &&
      actor.guestSessionId === cartGuestSession
    ) {
      return;
    }

    throw new ForbiddenException(
      'You do not have permission to manage this cart item',
    );
  }

  private mapCartResponse(cart: CartWithDrafts): GetCartResponse {
    const items = (cart.ring_design_drafts || []).map((d) =>
      this.mapDraftItem(d),
    );
    const totalEstimatedPrice = items.reduce(
      (sum, item) => sum + (item.estimatedPrice || 0),
      0,
    );

    return {
      id: cart.id,
      status: cart.status,
      itemsCount: items.length,
      totalEstimatedPrice,
      currency: 'VND',
      expiresAt: cart.expires_at ? cart.expires_at.toISOString() : undefined,
      items,
    };
  }

  private mapDraftItem(draft: {
    id: string;
    template_variant_id: string;
    target_size: unknown;
    personalization_package: string;
    memory_enabled: boolean;
    gemstone_config_json: unknown;
    estimated_price: unknown;
    currency: string;
    estimated_price_at: Date | null;
    status: string;
    created_at: Date;
    template_variants?: {
      standard_size: unknown;
      materials: { name: string };
      ring_templates: { code: string; name: string };
    };
  }): CartItemDraft {
    const selections =
      (draft.gemstone_config_json as GemstoneSelectionItem[]) || [];

    return {
      draftId: draft.id,
      templateVariantId: draft.template_variant_id,
      templateCode: draft.template_variants?.ring_templates.code ?? '',
      templateName: draft.template_variants?.ring_templates.name ?? '',
      materialName: draft.template_variants?.materials.name ?? '',
      standardSize: draft.template_variants
        ? Number(draft.template_variants.standard_size)
        : 0,
      targetSize: Number(draft.target_size),
      personalizationPackage: draft.personalization_package,
      memoryEnabled: draft.memory_enabled,
      gemstoneSelections: selections,
      estimatedPrice: draft.estimated_price ? Number(draft.estimated_price) : 0,
      currency: draft.currency,
      estimatedPriceAt: draft.estimated_price_at
        ? draft.estimated_price_at.toISOString()
        : '',
      status: draft.status,
      createdAt: draft.created_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-009] Create Design Share Link
  // ---------------------------------------------------------------------------
  async createDesignShareLink(
    request: CreateDesignShareLinkRequest,
  ): Promise<CreateDesignShareLinkResponse> {
    const actor = this.validateActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);
    if (!draft) {
      throw new NotFoundException(`Draft ${request.draftId} not found`);
    }

    // Ownership check
    if (
      actor.userId &&
      draft.owner_user_id &&
      draft.owner_user_id !== actor.userId
    ) {
      throw new ForbiddenException('You do not own this design draft');
    }
    if (
      actor.guestSessionId &&
      draft.guest_session_id &&
      draft.guest_session_id !== actor.guestSessionId
    ) {
      throw new ForbiddenException('You do not own this design draft');
    }

    const days =
      request.expiresInDays && request.expiresInDays > 0
        ? request.expiresInDays
        : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const rawCode = `MMR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');

    const created = await this.repository.createDesignShareCode({
      draftId: draft.id,
      codeHash,
      expiresAt,
    });

    return {
      linkId: created.id,
      code: rawCode,
      shareUrl: `https://memora.vn/design/shared?code=${rawCode}`,
      status: created.status,
      expiresAt: created.expires_at.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // [DESIG-010] Revoke Design Share Link
  // ---------------------------------------------------------------------------
  async revokeDesignShareLink(
    request: RevokeDesignShareLinkRequest,
  ): Promise<RevokeDesignShareLinkResponse> {
    const actor = this.validateActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);
    if (!draft) {
      throw new NotFoundException(`Draft ${request.draftId} not found`);
    }

    if (
      actor.userId &&
      draft.owner_user_id &&
      draft.owner_user_id !== actor.userId
    ) {
      throw new ForbiddenException('You do not own this design draft');
    }

    const designCode = await this.repository.findDesignCodeById(
      request.linkId,
      request.draftId,
    );
    if (!designCode) {
      throw new NotFoundException(
        `Share link ${request.linkId} not found for this draft`,
      );
    }

    if (designCode.status === 'REVOKED') {
      return {
        success: true,
        message: 'Share link already revoked',
      };
    }

    await this.repository.revokeDesignShareCode(designCode.id);

    return {
      success: true,
      message: 'Share link revoked successfully',
    };
  }
}
