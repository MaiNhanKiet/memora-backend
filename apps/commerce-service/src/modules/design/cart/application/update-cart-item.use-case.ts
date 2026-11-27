import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  UpdateCartItemRequest,
  UpdateCartItemResponse,
} from '@app/contracts';
import { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
import {
  buildGemstoneConfigJson,
  extractMaintenancePlan,
  mapCartResponse,
  mapDraftItem,
  parseGemstoneSelections,
} from './cart.mapper';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import {
  assertDraftOwnership,
  priceCartSelections,
  validateCartActor,
} from './cart.validation';

@Injectable()
export class UpdateCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
  ) {}

  async execute(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse> {
    const actor = validateCartActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft || draft.status !== 'IN_CART') {
      throw new NotFoundException(`Draft ${request.draftId} not found in cart`);
    }

    assertDraftOwnership(draft, actor);

    const targetSize = request.targetSize ?? draft.targetSize;
    const pkg = request.personalizationPackage ?? draft.personalizationPackage;
    const memoryEnabled = request.memoryEnabled ?? draft.memoryEnabled;

    const selections = request.gemstoneSelectionUpdate
      ? (request.gemstoneSelectionUpdate.items ?? [])
      : parseGemstoneSelections(draft.gemstoneConfigJson);
    const currentPlan = extractMaintenancePlan(draft.gemstoneConfigJson);
    const maintenancePlan = request.maintenancePlan ?? currentPlan ?? 'NONE';

    const pricing = await priceCartSelections(
      this.repository,
      this.estimatePriceUseCase,
      {
        templateVariantId: draft.templateVariantId,
        targetSize,
        personalizationPackage: pkg,
        maintenancePlan,
      },
      selections,
    );

    const updated = await this.repository.updateDraft(draft.id, {
      targetSize,
      personalizationPackage: pkg,
      memoryEnabled,
      gemstoneConfigJson: buildGemstoneConfigJson(
        selections,
        maintenancePlan,
        pricing.certifiedPriceVersionIds,
      ),
      estimatedPrice: pricing.total,
      estimatedPriceAt: new Date(),
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    if (!updatedCart) {
      throw new NotFoundException('Active cart not found');
    }
    const mappedCart = mapCartResponse(updatedCart);

    return {
      item: mapDraftItem(updated),
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }
}
