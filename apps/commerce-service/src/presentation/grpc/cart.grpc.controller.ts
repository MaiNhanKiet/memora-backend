import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AbandonCartRequest,
  AbandonCartResponse,
  AddCartItemRequest,
  AddCartItemResponse,
  CartServiceHandler,
  GetCartRequest,
  GetCartResponse,
  RemoveCartItemRequest,
  RemoveCartItemResponse,
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  ValidateCheckoutRequest,
  ValidateCheckoutResponse,
} from '@app/contracts';
import { CartService } from '../../application/cart/cart.service';
import { CommerceInternalGrpcAuthGuard } from '../../grpc/commerce-internal-grpc-auth.guard';

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
}
