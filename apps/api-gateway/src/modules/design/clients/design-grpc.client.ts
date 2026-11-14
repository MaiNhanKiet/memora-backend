import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import type {
  AbandonCartRequest,
  AbandonCartResponse,
  AddCartItemRequest,
  AddCartItemResponse,
  CartServiceClient,
  GetCartRequest,
  GetCartResponse,
  RemoveCartItemRequest,
  RemoveCartItemResponse,
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  ValidateCheckoutRequest,
  ValidateCheckoutResponse,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const COMMERCE_CART_GRPC_CLIENT = 'COMMERCE_CART_GRPC_CLIENT';

@Injectable()
export class DesignGrpcClient extends DomainGrpcClient implements OnModuleInit {
  private cartService!: CartServiceClient;

  constructor(
    @Inject(COMMERCE_CART_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.commerceInternalGrpcSecret');
  }

  onModuleInit(): void {
    this.cartService =
      this.grpcClient.getService<CartServiceClient>('CartService');
  }

  getCart(request: GetCartRequest): Promise<GetCartResponse> {
    return this.unary((metadata) =>
      this.cartService.getCart(request, metadata),
    );
  }

  addCartItem(request: AddCartItemRequest): Promise<AddCartItemResponse> {
    return this.unary((metadata) =>
      this.cartService.addCartItem(request, metadata),
    );
  }

  updateCartItem(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse> {
    return this.unary((metadata) =>
      this.cartService.updateCartItem(request, metadata),
    );
  }

  removeCartItem(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse> {
    return this.unary((metadata) =>
      this.cartService.removeCartItem(request, metadata),
    );
  }

  validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse> {
    return this.unary((metadata) =>
      this.cartService.validateCheckout(request, metadata),
    );
  }

  abandonCart(request: AbandonCartRequest): Promise<AbandonCartResponse> {
    return this.unary((metadata) =>
      this.cartService.abandonCart(request, metadata),
    );
  }
}
