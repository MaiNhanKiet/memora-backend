import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { toPaginatedSuccessResponse } from '../../../../common/mappers/paginated-success.mapper';
import { MemoryGrpcClient } from '../../clients/memory-grpc.client';
import {
  ActivateCardDto,
  ChangePinDto,
  ListMyCardsQueryDto,
  ResetPinDto,
  SetupPinDto,
} from '../dto/memory-card.dto';
import {
  ApiActivateCardDocs,
  ApiChangePinDocs,
  ApiGetCardDetailDocs,
  ApiListMyCardsDocs,
  ApiResetPinDocs,
  ApiSetupPinDocs,
} from '../docs/memory-cards.swagger';

@ApiTags('Memory Cards')
@Controller('memory/cards')
export class MemoryCardsController {
  constructor(private readonly memoryClient: MemoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [MEMOR-001] GET /api/v1/memory/cards
  // ---------------------------------------------------------------------------
  @Get()
  @ApiListMyCardsDocs()
  async listMyCards(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListMyCardsQueryDto,
  ) {
    const actor = toVerifiedActor(principal);
    const res = await this.memoryClient.listMyCards({
      actor,
      page: query.page,
      limit: query.limit,
    });

    const page = res.page ?? query.page ?? 1;
    const limit = res.limit ?? query.limit ?? 20;
    const total = res.total ?? 0;
    const totalPages = total <= 0 ? 0 : Math.ceil(total / limit);

    return toPaginatedSuccessResponse({
      data: res.items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-002] GET /api/v1/memory/cards/:cardId
  // ---------------------------------------------------------------------------
  @Get(':cardId')
  @ApiGetCardDetailDocs()
  async getCardDetail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.getCardDetail({
      actor,
      cardId,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-003] POST /api/v1/memory/cards/:cardId/activate
  // ---------------------------------------------------------------------------
  @Post(':cardId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiActivateCardDocs()
  async activateCard(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: ActivateCardDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.activateCard({
      actor,
      cardId,
      initialPin: body.initialPin,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-004] POST /api/v1/memory/cards/:cardId/pin
  // ---------------------------------------------------------------------------
  @Post(':cardId/pin')
  @HttpCode(HttpStatus.OK)
  @ApiSetupPinDocs()
  async setupPin(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: SetupPinDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.setupPin({
      actor,
      cardId,
      pin: body.pin,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-005] PUT /api/v1/memory/cards/:cardId/pin
  // ---------------------------------------------------------------------------
  @Put(':cardId/pin')
  @HttpCode(HttpStatus.OK)
  @ApiChangePinDocs()
  async changePin(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: ChangePinDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.changePin({
      actor,
      cardId,
      currentPin: body.currentPin,
      newPin: body.newPin,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-006] POST /api/v1/memory/cards/:cardId/pin/reset
  // ---------------------------------------------------------------------------
  @Post(':cardId/pin/reset')
  @HttpCode(HttpStatus.OK)
  @ApiResetPinDocs()
  async resetPin(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: ResetPinDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.resetPin({
      actor,
      cardId,
      newPin: body.newPin,
    });
  }
}
