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
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedPrincipal } from '@app/auth';
import { Public } from '@app/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { MemoryGrpcClient } from '../../clients/memory-grpc.client';
import {
  CreateAccessGrantDto,
  GetMemoryBySessionQueryDto,
  RedeemInvitationDto,
} from '../dto/memory-grant.dto';
import {
  ApiCreateAccessGrantDocs,
  ApiGetMemoryBySessionDocs,
  ApiListAccessGrantsDocs,
  ApiRedeemInvitationDocs,
  ApiRevokeAccessGrantDocs,
} from '../docs/memory-grants.swagger';

@ApiTags('Memory Sharing & Access')
@Controller('memory')
export class MemoryGrantsController {
  constructor(private readonly memoryClient: MemoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [MEMOR-010] POST /api/v1/memory/cards/:cardId/grants
  // ---------------------------------------------------------------------------
  @Post('cards/:cardId/grants')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateAccessGrantDocs()
  async createAccessGrant(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: CreateAccessGrantDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.createAccessGrant({
      actor,
      cardId,
      granteeEmail: body.granteeEmail,
      ttlDays: body.ttlDays,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-011] GET /api/v1/memory/cards/:cardId/grants
  // ---------------------------------------------------------------------------
  @Get('cards/:cardId/grants')
  @ApiListAccessGrantsDocs()
  async listAccessGrants(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.listAccessGrants({
      actor,
      cardId,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-012] DELETE /api/v1/memory/cards/:cardId/grants/:grantId
  // ---------------------------------------------------------------------------
  @Delete('cards/:cardId/grants/:grantId')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeAccessGrantDocs()
  async revokeAccessGrant(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('grantId', ParseUUIDPipe) grantId: string,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.revokeAccessGrant({
      actor,
      cardId,
      grantId,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-013] POST /api/v1/memory/invitations/redeem
  // ---------------------------------------------------------------------------
  @Public()
  @Post('invitations/redeem')
  @HttpCode(HttpStatus.OK)
  @ApiRedeemInvitationDocs()
  async redeemInvitation(
    @Body() body: RedeemInvitationDto,
    @CurrentUser() principal?: AuthenticatedPrincipal,
  ) {
    const actor = principal ? toVerifiedActor(principal) : undefined;
    return this.memoryClient.redeemInvitation({
      invitationToken: body.invitationToken,
      actor,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-014] GET /api/v1/memory/access/:accessSessionId
  // ---------------------------------------------------------------------------
  @Public()
  @Get('access/:accessSessionId')
  @ApiGetMemoryBySessionDocs()
  async getMemoryBySession(
    @Param('accessSessionId', ParseUUIDPipe) accessSessionId: string,
    @Query() query: GetMemoryBySessionQueryDto,
  ) {
    return this.memoryClient.getMemoryBySession({
      accessSessionId,
      pin: query.pin,
    });
  }
}
