import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  RemoveCartItemRequest,
  RemoveCartItemResponse,
} from '@app/contracts';
import { mapCartResponse } from './cart.mapper';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import { assertDraftOwnership, validateCartActor } from './cart.validation';

@Injectable()
export class RemoveCartItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse> {
    const actor = validateCartActor(request.actor);
    const draft = await this.repository.findDraftById(request.draftId);

    if (!draft || draft.status !== 'IN_CART') {
      throw new NotFoundException(`Draft ${request.draftId} not found in cart`);
    }

    assertDraftOwnership(draft, actor);

    await this.repository.deleteDraft(draft.id);

    const updatedCart = await this.repository.findActiveCartByActor(actor);
    if (!updatedCart) {
      throw new NotFoundException('Active cart not found');
    }
    const mappedCart = mapCartResponse(updatedCart);

    return {
      removedDraftId: draft.id,
      itemsCount: mappedCart.itemsCount,
      totalEstimatedPrice: mappedCart.totalEstimatedPrice,
      currency: mappedCart.currency,
    };
  }
}
