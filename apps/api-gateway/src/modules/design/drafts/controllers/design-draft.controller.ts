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
import { AllowGuest } from '@app/common';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { CurrentGuest } from '../../../../common/decorators/current-guest.decorator';
import type { GatewayGuest } from '../../../../common/grpc/gateway-guest';
import { toActorFromUserOrGuest } from '../../../../common/grpc/verified-actor';
import { DesignGrpcClient } from '../../clients/design-grpc.client';
import {
  ApiDuplicateDesignDraftDocs,
  ApiGetDesignDraftDocs,
} from '../docs/design-draft.swagger';
import {
  ApiCreateDesignShareLink,
  ApiRevokeDesignShareLink,
} from '../docs/design-share.swagger';
import {
  CreateDesignShareLinkBodyDto,
  CreateDesignShareLinkResponseDto,
  RevokeDesignShareLinkResponseDto,
} from '../dto';
import {
  toCreateDesignShareLinkGrpcRequest,
  toCreateDesignShareLinkResponseDto,
  toDuplicateDesignDraftGrpcRequest,
  toGetDesignDraftGrpcRequest,
  toRevokeDesignShareLinkGrpcRequest,
  toRevokeDesignShareLinkResponseDto,
} from '../mappers/draft-http.mapper';

@ApiTags('commerce-design-drafts')
@Controller('design/drafts')
export class DesignDraftController {
  constructor(private readonly designClient: DesignGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [DESIG-007] GET /api/v1/design/drafts/:draftId
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Get(':draftId')
  @ApiGetDesignDraftDocs()
  async getDesignDraft(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.getDesignDraft(
      toGetDesignDraftGrpcRequest(actor, draftId),
    );
  }

  // ---------------------------------------------------------------------------
  // [DESIG-008] POST /api/v1/design/drafts/:draftId/duplicate
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post(':draftId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiDuplicateDesignDraftDocs()
  async duplicateDesignDraft(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ) {
    const actor = toActorFromUserOrGuest(user, guest);
    return this.designClient.duplicateDesignDraft(
      toDuplicateDesignDraftGrpcRequest(actor, draftId),
    );
  }

  // ---------------------------------------------------------------------------
  // [DESIG-009] POST /api/v1/design/drafts/:draftId/share-links
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Post(':draftId/share-links')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateDesignShareLink()
  async createDesignShareLink(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() body: CreateDesignShareLinkBodyDto,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ): Promise<CreateDesignShareLinkResponseDto> {
    const actor = toActorFromUserOrGuest(user, guest);
    const res = await this.designClient.createDesignShareLink(
      toCreateDesignShareLinkGrpcRequest(actor, draftId, body),
    );
    return toCreateDesignShareLinkResponseDto(res);
  }

  // ---------------------------------------------------------------------------
  // [DESIG-010] DELETE /api/v1/design/drafts/:draftId/share-links/:linkId
  // ---------------------------------------------------------------------------
  @AllowGuest({ session: true })
  @Delete(':draftId/share-links/:linkId')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeDesignShareLink()
  async revokeDesignShareLink(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @CurrentUser() user?: AuthenticatedPrincipal,
    @CurrentGuest() guest?: GatewayGuest,
  ): Promise<RevokeDesignShareLinkResponseDto> {
    const actor = toActorFromUserOrGuest(user, guest);
    const res = await this.designClient.revokeDesignShareLink(
      toRevokeDesignShareLinkGrpcRequest(actor, draftId, linkId),
    );
    return toRevokeDesignShareLinkResponseDto(res);
  }
}
