import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  DuplicateDesignDraftRequest,
  DuplicateDesignDraftResponse,
  GetDesignDraftRequest,
  GetDesignDraftResponse,
} from '@app/contracts';
import { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
import {
  buildGemstoneConfigJson,
  extractMaintenancePlan,
  mapCartResponse,
  mapDraftItem,
  parseGemstoneSelections,
} from './cart.mapper';
import {
  CART_REPOSITORY,
  ensureActiveCart,
  type CartRepository,
} from './cart.repository';
import { assertDraftOwnership, validateCartActor } from './cart.validation';

@Injectable()
export class GetDesignDraftUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(
    request: GetDesignDraftRequest,
  ): Promise<GetDesignDraftResponse> {
    const actor = validateCartActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft) {
      throw new NotFoundException(`Design draft ${request.draftId} not found`);
    }

    assertDraftOwnership(draft, actor);

    return {
      draft: mapDraftItem(draft),
    };
  }
}

@Injectable()
export class DuplicateDesignDraftUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
  ) {}

  async execute(
    request: DuplicateDesignDraftRequest,
  ): Promise<DuplicateDesignDraftResponse> {
    const actor = validateCartActor(request.actor);
    const sourceDraft = await this.repository.findDraftById(request.draftId);

    if (!sourceDraft) {
      throw new NotFoundException(`Design draft ${request.draftId} not found`);
    }

    assertDraftOwnership(sourceDraft, actor);

    const cart = await ensureActiveCart(this.repository, actor);

    const currentGemstones = parseGemstoneSelections(
      sourceDraft.gemstoneConfigJson,
    );
    const currentPlan = extractMaintenancePlan(sourceDraft.gemstoneConfigJson);
    const pricing = await this.estimatePriceUseCase.execute({
      templateVariantId: sourceDraft.templateVariantId,
      targetSize: sourceDraft.targetSize,
      gemstoneOptionIds: currentGemstones.map((g) => g.gemstoneOptionId),
      personalizationPackage: sourceDraft.personalizationPackage || 'NONE',
      maintenancePlan: currentPlan ?? 'NONE',
    });

    const newDraft = await this.repository.createDraft({
      cartId: cart.id,
      ownerUserId: actor.userId,
      guestSessionId: actor.guestSessionId,
      templateVariantId: sourceDraft.templateVariantId,
      targetSize: sourceDraft.targetSize,
      gemstoneConfigJson: buildGemstoneConfigJson(
        currentGemstones,
        currentPlan ?? 'NONE',
      ),
      personalizationPackage: sourceDraft.personalizationPackage,
      memoryEnabled: sourceDraft.memoryEnabled,
      estimatedPrice: pricing.estimatedTotal,
      currency: pricing.currency,
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    if (!updatedCart) {
      throw new NotFoundException('Active cart not found');
    }
    const mappedCart = mapCartResponse(updatedCart);

    return {
      draft: mapDraftItem(newDraft),
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }
}
