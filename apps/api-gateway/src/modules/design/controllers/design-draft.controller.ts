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
import { Public } from '@app/common';
import { DesignGrpcClient } from '../clients/design-grpc.client';
import {
  ExtractCartActor,
  type CartActor,
} from '../decorators/extract-cart-actor.decorator';
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
  @Public()
  @Get(':draftId')
  @ApiGetDesignDraftDocs()
  async getDesignDraft(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ExtractCartActor() actor: CartActor,
  ) {
    return this.designClient.getDesignDraft({
      draftId,
      actor,
    });
  }

  // ---------------------------------------------------------------------------
  // [DESIG-008] POST /api/v1/design/drafts/:draftId/duplicate
  // ---------------------------------------------------------------------------
  @Public()
  @Post(':draftId/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiDuplicateDesignDraftDocs()
  async duplicateDesignDraft(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ExtractCartActor() actor: CartActor,
  ) {
    return this.designClient.duplicateDesignDraft({
      draftId,
      actor,
    });
  }
}
