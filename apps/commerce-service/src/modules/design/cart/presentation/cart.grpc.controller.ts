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
import { CartService } from '../application/cart.service';
import { CommerceInternalGrpcAuthGuard } from '../../../../grpc/commerce-internal-grpc-auth.guard';

@Controller()
@UseGuards(CommerceInternalGrpcAuthGuard)
export class CartGrpcController implements CartServiceHandler {
  constructor(private readonly cartService: CartService) {}

  @GrpcMethod('CartService', 'GetCart')
  getCart(request: GetCartRequest): Promise<GetCartResponse> {
    return this.cartService.getCart(request);
  }

  @GrpcMethod('CartService', 'AddCartItem')
  addCartItem(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    return this.cartService.addCartItem(request);
  }

  @GrpcMethod('CartService', 'UpdateCartItem')
  updateCartItem(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse> {
    return this.cartService.updateCartItem(request);
  }

  @GrpcMethod('CartService', 'RemoveCartItem')
  removeCartItem(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse> {
    return this.cartService.removeCartItem(request);
  }

  @GrpcMethod('CartService', 'ValidateCheckout')
  validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse> {
    return this.cartService.validateCheckout(request);
  }

  @GrpcMethod('CartService', 'AbandonCart')
  abandonCart(request: AbandonCartRequest): Promise<AbandonCartResponse> {
    return this.cartService.abandonCart(request);
  }

  @GrpcMethod('CartService', 'GetDesignDraft')
  getDesignDraft(
    request: GetDesignDraftRequest,
  ): Promise<GetDesignDraftResponse> {
    return this.cartService.getDesignDraft(request);
  }

  @GrpcMethod('CartService', 'DuplicateDesignDraft')
  duplicateDesignDraft(
    request: DuplicateDesignDraftRequest,
  ): Promise<DuplicateDesignDraftResponse> {
    return this.cartService.duplicateDesignDraft(request);
  }

  @GrpcMethod('CartService', 'CreateDesignShareLink')
  createDesignShareLink(
    request: CreateDesignShareLinkRequest,
  ): Promise<CreateDesignShareLinkResponse> {
    return this.cartService.createDesignShareLink(request);
  }

  @GrpcMethod('CartService', 'RevokeDesignShareLink')
  revokeDesignShareLink(
    request: RevokeDesignShareLinkRequest,
  ): Promise<RevokeDesignShareLinkResponse> {
    return this.cartService.revokeDesignShareLink(request);
  }
}
