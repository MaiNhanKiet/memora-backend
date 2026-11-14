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
import { Public } from '@app/common';
import { DesignGrpcClient } from '../clients/design-grpc.client';
import {
  ExtractCartActor,
  type CartActor,
} from '../decorators/extract-cart-actor.decorator';
import {
  AddCartItemBodyDto,
  UpdateCartItemBodyDto,
  ValidateCheckoutBodyDto,
} from '../dto/cart.dto';
import {
  ApiAbandonCartDocs,
  ApiAddCartItemDocs,
  ApiGetCartDocs,
  ApiRemoveCartItemDocs,
  ApiUpdateCartItemDocs,
  ApiValidateCheckoutDocs,
} from '../docs/cart.swagger';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly designClient: DesignGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [DESIG-001] GET /api/v1/cart
  // ---------------------------------------------------------------------------
  @Public()
  @Get()
  @ApiGetCartDocs()
  async getCart(@ExtractCartActor() actor: CartActor) {
    return this.designClient.getCart({ actor });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-002] POST /api/v1/cart/items
  // ---------------------------------------------------------------------------
  @Public()
  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiAddCartItemDocs()
  async addCartItem(
    @ExtractCartActor() actor: CartActor,
    @Body() body: AddCartItemBodyDto,
  ) {
    return this.designClient.addCartItem({
      actor,
      templateVariantId: body.templateVariantId,
      targetSize: body.targetSize,
      gemstoneSelections: body.gemstoneSelections.map((sel) => ({
        slotNumber: sel.slotNumber,
        gemstoneOptionId: sel.gemstoneOptionId,
      })),
      personalizationPackage: body.personalizationPackage ?? 'NONE',
      memoryEnabled: body.memoryEnabled ?? false,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-003] PATCH /api/v1/cart/items/:draftId
  // ---------------------------------------------------------------------------
  @Public()
  @Patch('items/:draftId')
  @ApiUpdateCartItemDocs()
  async updateCartItem(
    @ExtractCartActor() actor: CartActor,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() body: UpdateCartItemBodyDto,
  ) {
    return this.designClient.updateCartItem({
      actor,
      draftId,
      targetSize: body.targetSize,
      personalizationPackage: body.personalizationPackage,
      memoryEnabled: body.memoryEnabled,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-004] DELETE /api/v1/cart/items/:draftId
  // ---------------------------------------------------------------------------
  @Public()
  @Delete('items/:draftId')
  @ApiRemoveCartItemDocs()
  async removeCartItem(
    @ExtractCartActor() actor: CartActor,
    @Param('draftId', ParseUUIDPipe) draftId: string,
  ) {
    return this.designClient.removeCartItem({
      actor,
      draftId,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-005] POST /api/v1/cart/validate-checkout
  // ---------------------------------------------------------------------------
  @Public()
  @Post('validate-checkout')
  @HttpCode(HttpStatus.OK)
  @ApiValidateCheckoutDocs()
  async validateCheckout(
    @ExtractCartActor() actor: CartActor,
    @Body() body: ValidateCheckoutBodyDto,
  ) {
    return this.designClient.validateCheckout({
      actor,
      selectedDraftIds: body.selectedDraftIds,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-006] POST /api/v1/cart/abandon
  // ---------------------------------------------------------------------------
  @Public()
  @Post('abandon')
  @HttpCode(HttpStatus.OK)
  @ApiAbandonCartDocs()
  async abandonCart(@ExtractCartActor() actor: CartActor) {
    return this.designClient.abandonCart({ actor });
  }
}
