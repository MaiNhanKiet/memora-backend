import { Inject, Injectable } from '@nestjs/common';
import type { GetCartRequest, GetCartResponse } from '@app/contracts';
import { mapCartResponse } from './cart.mapper';
import {
  CART_REPOSITORY,
  ensureActiveCart,
  type CartRepository,
} from './cart.repository';
import { validateCartActor } from './cart.validation';

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
  ) {}

  async execute(request: GetCartRequest): Promise<GetCartResponse> {
    const actor = validateCartActor(request.actor);
    const cart = await ensureActiveCart(this.repository, actor);
    return mapCartResponse(cart);
  }
}
