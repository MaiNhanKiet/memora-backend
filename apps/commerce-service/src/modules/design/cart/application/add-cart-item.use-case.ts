import { Inject, Injectable } from '@nestjs/common';
import type { AddCartItemRequest, AddCartItemResponse } from '@app/contracts';
import { PricingService } from '../../../pricing/pricing-core/application/pricing.service';
import {
  buildGemstoneConfigJson,
  mapCartResponse,
  mapDraftItem,
} from './cart.mapper';
import {
  CART_REPOSITORY,
  ensureActiveCart,
  type CartRepository,
} from './cart.repository';
import { validateCartActor } from './cart.validation';

@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
    private readonly pricingService: PricingService,
  ) {}

  async execute(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    const actor = validateCartActor(request.actor);
    const cart = await ensureActiveCart(this.repository, actor);

    const maintenancePlan = request.maintenancePlan || 'NONE';
    const selections = request.gemstoneSelections || [];
    const gemstoneOptionIds = selections.map((g) => g.gemstoneOptionId);

    const pricing = await this.pricingService.estimatePrice({
      templateVariantId: request.templateVariantId,
      targetSize: request.targetSize,
      gemstoneOptionIds,
      personalizationPackage: request.personalizationPackage || 'NONE',
      maintenancePlan,
    });

    const draft = await this.repository.createDraft({
      cartId: cart.id,
      ownerUserId: actor.userId,
      guestSessionId: actor.guestSessionId,
      templateVariantId: request.templateVariantId,
      targetSize: request.targetSize,
      gemstoneConfigJson: buildGemstoneConfigJson(selections, maintenancePlan),
      personalizationPackage: request.personalizationPackage || 'NONE',
      memoryEnabled: request.memoryEnabled ?? false,
      estimatedPrice: pricing.estimatedTotal,
      currency: pricing.currency,
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    const mappedCart = mapCartResponse(updatedCart!);

    return {
      item: mapDraftItem(draft),
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }
}
