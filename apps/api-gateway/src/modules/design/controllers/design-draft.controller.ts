import {
  Controller,
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
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentGuest } from '../../../common/decorators/current-guest.decorator';
import type { GatewayGuest } from '../../../common/grpc/gateway-guest';
import { toActorFromUserOrGuest } from '../../../common/grpc/verified-actor';
import { DesignGrpcClient } from '../clients/design-grpc.client';
import {
  ApiDuplicateDesignDraftDocs,
  ApiGetDesignDraftDocs,
} from '../docs/design-draft.swagger';

@ApiTags('design-drafts')
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
    return this.designClient.getDesignDraft({
      draftId,
      actor,
    });
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
    return this.designClient.duplicateDesignDraft({
      draftId,
      actor,
    });
  }
}
