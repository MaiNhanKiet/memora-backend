import { Module } from '@nestjs/common';
import { PricingModule } from '../../pricing/pricing.module';
import { AbandonCartUseCase } from './application/abandon-cart.use-case';
import { AddCartItemUseCase } from './application/add-cart-item.use-case';
import { CART_REPOSITORY } from './application/cart.repository';
import {
  DuplicateDesignDraftUseCase,
  GetDesignDraftUseCase,
} from './application/design-draft.use-cases';
import {
  CreateDesignShareLinkUseCase,
  RevokeDesignShareLinkUseCase,
} from './application/design-share-code.use-cases';
import { GetCartUseCase } from './application/get-cart.use-case';
import { RemoveCartItemUseCase } from './application/remove-cart-item.use-case';
import { UpdateCartItemUseCase } from './application/update-cart-item.use-case';
import { ValidateCheckoutUseCase } from './application/validate-checkout.use-case';
import { PrismaCartRepository } from './infrastructure/prisma-cart.repository';
import { CartGrpcController } from './presentation/cart.grpc.controller';

@Module({
  imports: [PricingModule],
  controllers: [CartGrpcController],
  providers: [
    GetCartUseCase,
    AddCartItemUseCase,
    UpdateCartItemUseCase,
    RemoveCartItemUseCase,
    ValidateCheckoutUseCase,
    AbandonCartUseCase,
    GetDesignDraftUseCase,
    DuplicateDesignDraftUseCase,
    CreateDesignShareLinkUseCase,
    RevokeDesignShareLinkUseCase,
    { provide: CART_REPOSITORY, useClass: PrismaCartRepository },
  ],
  exports: [CART_REPOSITORY],
})
export class CartModule {}
