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
import type { MemoryContentType } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { MemoryGrpcClient } from '../../clients/memory-grpc.client';
import {
  InitiateMediaUploadDto,
  ListCardContentsQueryDto,
  UpdateCardContentsDto,
} from '../dto/memory-content.dto';
import {
  ApiInitiateMediaUploadDocs,
  ApiListCardContentsDocs,
  ApiUpdateCardContentsDocs,
} from '../docs/memory-contents.swagger';

@ApiTags('Memory Contents')
@Controller('memory/cards/:cardId')
export class MemoryContentsController {
  constructor(private readonly memoryClient: MemoryGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [MEMOR-007] GET /api/v1/memory/cards/:cardId/contents
  // ---------------------------------------------------------------------------
  @Get('contents')
  @ApiListCardContentsDocs()
  async listContents(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Query() query: ListCardContentsQueryDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.listCardContents({
      actor,
      cardId,
      pin: query.pin,
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-008] PUT /api/v1/memory/cards/:cardId/contents
  // ---------------------------------------------------------------------------
  @Put('contents')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateCardContentsDocs()
  async updateContents(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: UpdateCardContentsDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.updateCardContents({
      actor,
      cardId,
      items: body.items.map((i) => ({
        id: i.id,
        contentType: i.contentType as MemoryContentType,
        title: i.title,
        textContent: i.textContent,
        assetKey: i.assetKey,
        sortOrder: i.sortOrder,
        layoutJson: i.layoutJson,
      })),
    });
  }

  // ---------------------------------------------------------------------------
  // [MEMOR-009] POST /api/v1/memory/cards/:cardId/media/initiate
  // ---------------------------------------------------------------------------
  @Post('media/initiate')
  @HttpCode(HttpStatus.OK)
  @ApiInitiateMediaUploadDocs()
  async initiateMediaUpload(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() body: InitiateMediaUploadDto,
  ) {
    const actor = toVerifiedActor(principal);
    return this.memoryClient.initiateMediaUpload({
      actor,
      cardId,
      fileName: body.fileName,
      contentType: body.contentType,
      fileSize: body.fileSize,
    });
  }
}
