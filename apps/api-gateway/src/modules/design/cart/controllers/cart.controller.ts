import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowGuest } from '@app/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentGuest } from '../../../../common/decorators/current-guest.decorator';
import type { GatewayGuest } from '../../../../common/grpc/gateway-guest';
import { toActorFromUserOrGuest } from '../../../../common/grpc/verified-actor';
import { DesignGrpcClient } from '../../clients/design-grpc.client';
import {
  AddCartItemBodyDto,
  UpdateCartItemBodyDto,
  ValidateCheckoutBodyDto,
} from '../dto';
import {
  ApiAbandonCartDocs,
  ApiAddCartItemDocs,
  ApiGetCartDocs,
  ApiRemoveCartItemDocs,
  ApiUpdateCartItemDocs,
  ApiValidateCheckoutDocs,
} from '../docs/cart.swagger';
import {
  toAddCartItemGrpcRequest,
  toUpdateCartItemGrpcRequest,
  toValidateCheckoutGrpcRequest,
} from '../mappers/cart-http.mapper';

@ApiTags('commerce-cart')
@Controller('cart')
export class CartController {
  constructor(private readonly designClient: DesignGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [DESIG-001] GET /api/v1/cart
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Get()
  @ApiGetCartDocs()
  async getCart(
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.getCart({ actor });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-002] POST /api/v1/cart/items
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiAddCartItemDocs()
  async addCartItem(
    @CurrentUser() user: AuthenticatedPrincipal | undefined,
    @CurrentGuest() guest: GatewayGuest | undefined,
    @Body() body: AddCartItemBodyDto,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.addCartItem(toAddCartItemGrpcRequest(actor, body));
  }

  // ---------------------------------------------------------------------------
  // [DESIG-003] PATCH /api/v1/cart/items/:draftId
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Patch('items/:draftId')
  @ApiUpdateCartItemDocs()
  async updateCartItem(
    @CurrentUser() user: AuthenticatedPrincipal | undefined,
    @CurrentGuest() guest: GatewayGuest | undefined,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() body: UpdateCartItemBodyDto,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.updateCartItem(
      toUpdateCartItemGrpcRequest(actor, draftId, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [DESIG-004] DELETE /api/v1/cart/items/:draftId
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Delete('items/:draftId')
  @ApiRemoveCartItemDocs()
  async removeCartItem(
    @CurrentUser() user: AuthenticatedPrincipal | undefined,
    @CurrentGuest() guest: GatewayGuest | undefined,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.removeCartItem({
      actor,
      draftId,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-005] POST /api/v1/cart/validate-checkout
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post('validate-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiValidateCheckoutDocs()
  async validateCheckout(
    @CurrentUser() user: AuthenticatedPrincipal | undefined,
    @CurrentGuest() guest: GatewayGuest | undefined,
    @Body() body: ValidateCheckoutBodyDto,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.validateCheckout(
      toValidateCheckoutGrpcRequest(actor, body),
    );
  }

  // ---------------------------------------------------------------------------
  // [DESIG-006] POST /api/v1/cart/abandon
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post('abandon')
  @HttpCode(HttpStatus.OK)
  @ApiAbandonCartDocs()
  async abandonCart(
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.abandonCart({ actor });
  }
}
