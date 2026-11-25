import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { AbandonCartRequest, AbandonCartResponse } from '@app/contracts';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import { validateCartActor } from './cart.validation';

@Injectable()
export class AbandonCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(request: AbandonCartRequest): Promise<AbandonCartResponse> {
    const actor = validateCartActor(request.actor);
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
}
