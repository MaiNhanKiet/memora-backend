import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AddCartItemRequest, AddCartItemResponse } from '@app/contracts';
import { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
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
import { priceCartSelections, validateCartActor } from './cart.validation';

@Injectable()
export class AddCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
  ) {}

  async execute(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    const actor = validateCartActor(request.actor);
    const cart = await ensureActiveCart(this.repository, actor);

    const maintenancePlan = request.maintenancePlan || 'NONE';
    const selections = request.gemstoneSelections || [];

    const pricing = await priceCartSelections(
      this.repository,
      this.estimatePriceUseCase,
      {
        templateVariantId: request.templateVariantId,
        targetSize: request.targetSize,
        personalizationPackage: request.personalizationPackage || 'NONE',
        maintenancePlan,
      },
      selections,
    );

    const draft = await this.repository.createDraft({
      cartId: cart.id,
      ownerUserId: actor.userId,
      guestSessionId: actor.guestSessionId,
      templateVariantId: request.templateVariantId,
      targetSize: request.targetSize,
      gemstoneConfigJson: buildGemstoneConfigJson(
        selections,
        maintenancePlan,
        pricing.certifiedPriceVersionIds,
      ),
      personalizationPackage: request.personalizationPackage || 'NONE',
      memoryEnabled: request.memoryEnabled ?? false,
      estimatedPrice: pricing.total,
      currency: pricing.currency,
    });

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    if (!updatedCart) {
      throw new NotFoundException('Active cart not found');
    }
    const mappedCart = mapCartResponse(updatedCart);

    return {
      item: mapDraftItem(draft),
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }
}
