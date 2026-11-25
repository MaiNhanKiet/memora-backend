import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowGuest, Public } from '@app/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentGuest } from '../../../../common/decorators/current-guest.decorator';
import type { GatewayGuest } from '../../../../common/grpc/gateway-guest';
import { toActorFromUserOrGuest } from '../../../../common/grpc/verified-actor';
import { PlatformSharingGrpcClient } from '../clients/platform-sharing-grpc.client';
import {
  ApiCreateShareLinkDocs,
  ApiResolveShareLinkDocs,
  ApiRevokeShareLinkDocs,
} from '../docs/sharing.swagger';
import {
  CreateShareLinkRequestDto,
  CreateShareLinkResponseDto,
  ResolvedShareLinkResponseDto,
  RevokeShareLinkResponseDto,
} from '../dto';
import {
  toCreateShareLinkGrpcRequest,
  toCreateShareLinkResponseDto,
  toResolveShareLinkResponseDto,
  toRevokeShareLinkResponseDto,
} from '../mappers/sharing-http.mapper';

@ApiTags('Platform - 3D Ring Sharing')
@Controller('shares')
export class SharingController {
  constructor(
    private readonly platformSharingClient: PlatformSharingGrpcClient,
  ) {}

  // ---------------------------------------------------------------------------
  // [PLATF-010] GET /api/v1/shares/:shareToken
  // ---------------------------------------------------------------------------
  @Public()
  @Get(':shareToken')
  @ApiResolveShareLinkDocs()
  async resolveShareLink(
    @Param('shareToken') shareToken: string,
  ): Promise<ResolvedShareLinkResponseDto> {
    const res = await this.platformSharingClient.resolveShareLink({
      shareToken,
    });
    return toResolveShareLinkResponseDto(res);
  }

  // ---------------------------------------------------------------------------
  // [PLATF-011] POST /api/v1/shares
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateShareLinkDocs()
  async createShareLink(
    @Body() body: CreateShareLinkRequestDto,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ): Promise<CreateShareLinkResponseDto> {
    const actor = toActorFromUserOrGuest(user, guest);
    const res = await this.platformSharingClient.createShareLink(
      toCreateShareLinkGrpcRequest(actor, body),
    );
    return toCreateShareLinkResponseDto(res);
  }

  // ---------------------------------------------------------------------------
  // DELETE /api/v1/shares/:shareLinkId
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Delete(':shareLinkId')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeShareLinkDocs()
  async revokeShareLink(
    @Param('shareLinkId', ParseUUIDPipe) shareLinkId: string,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ): Promise<RevokeShareLinkResponseDto> {
    const actor = toActorFromUserOrGuest(user, guest);
    const res = await this.platformSharingClient.revokeShareLink({
      actor,
      shareLinkId,
    });
    return toRevokeShareLinkResponseDto(res);
  }
}
