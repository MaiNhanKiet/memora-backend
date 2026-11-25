import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AbandonCartRequest,
  AbandonCartResponse,
  AddCartItemRequest,
  AddCartItemResponse,
  CartServiceHandler,
  CreateDesignShareLinkRequest,
  CreateDesignShareLinkResponse,
  DuplicateDesignDraftRequest,
  DuplicateDesignDraftResponse,
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
} from '@app/contracts';
import { AbandonCartUseCase } from '../application/abandon-cart.use-case';
import { AddCartItemUseCase } from '../application/add-cart-item.use-case';
import { DesignDraftUseCases } from '../application/design-draft.use-cases';
import { DesignShareCodeUseCases } from '../application/design-share-code.use-cases';
import { GetCartUseCase } from '../application/get-cart.use-case';
import { RemoveCartItemUseCase } from '../application/remove-cart-item.use-case';
import { UpdateCartItemUseCase } from '../application/update-cart-item.use-case';
import { ValidateCheckoutUseCase } from '../application/validate-checkout.use-case';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class CartGrpcController implements CartServiceHandler {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addCartItemUseCase: AddCartItemUseCase,
    private readonly updateCartItemUseCase: UpdateCartItemUseCase,
    private readonly removeCartItemUseCase: RemoveCartItemUseCase,
    private readonly validateCheckoutUseCase: ValidateCheckoutUseCase,
    private readonly abandonCartUseCase: AbandonCartUseCase,
    private readonly designDraftUseCases: DesignDraftUseCases,
    private readonly designShareCodeUseCases: DesignShareCodeUseCases,
  ) {}

  @GrpcMethod('CartService', 'GetCart')
  getCart(request: GetCartRequest): Promise<GetCartResponse> {
    return this.getCartUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'AddCartItem')
  addCartItem(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    return this.addCartItemUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'UpdateCartItem')
  updateCartItem(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse> {
    return this.updateCartItemUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'RemoveCartItem')
  removeCartItem(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse> {
    return this.removeCartItemUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'ValidateCheckout')
  validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse> {
    return this.validateCheckoutUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'AbandonCart')
  abandonCart(request: AbandonCartRequest): Promise<AbandonCartResponse> {
    return this.abandonCartUseCase.execute(request);
  }

  @GrpcMethod('CartService', 'GetDesignDraft')
  getDesignDraft(
    request: GetDesignDraftRequest,
  ): Promise<GetDesignDraftResponse> {
    return this.designDraftUseCases.getDesignDraft(request);
  }

  @GrpcMethod('CartService', 'DuplicateDesignDraft')
  duplicateDesignDraft(
    request: DuplicateDesignDraftRequest,
  ): Promise<DuplicateDesignDraftResponse> {
    return this.designDraftUseCases.duplicateDesignDraft(request);
  }

  @GrpcMethod('CartService', 'CreateDesignShareLink')
  createDesignShareLink(
    request: CreateDesignShareLinkRequest,
  ): Promise<CreateDesignShareLinkResponse> {
    return this.designShareCodeUseCases.createDesignShareLink(request);
  }

  @GrpcMethod('CartService', 'RevokeDesignShareLink')
  revokeDesignShareLink(
    request: RevokeDesignShareLinkRequest,
  ): Promise<RevokeDesignShareLinkResponse> {
    return this.designShareCodeUseCases.revokeDesignShareLink(request);
  }
}
