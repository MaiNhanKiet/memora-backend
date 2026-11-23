import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import {
  ApiGetSourceProcessingDocs,
  ApiListOrderSourcesDocs,
} from '../docs/sources.swagger';
import {
  ApiAcceptWavecodeStyleDocs,
  ApiGetWavecodeDocs,
  ApiResegmentSoundwaveDocs,
  ApiSelectWavecodeStyleDocs,
} from '../docs/wavecode.swagger';
import {
  AcceptWavecodeStyleRequestDto,
  ResegmentSoundwaveRequestDto,
  SelectWavecodeStyleRequestDto,
  type WavecodeResponseDto,
} from '../dto/wavecode.dto';
import { toWavecodeResponse } from '../mappers/wavecode-http.mapper';
import type { PersonalizationSourceResponseDto } from '../dto/personalization-source.response.dto';
import type { SourceProcessingResponseDto } from '../dto/source-processing.response.dto';
import { toPersonalizationSourceListResponse } from '../mappers/personalization-source-http.mapper';
import { toSourceProcessingResponse } from '../mappers/source-processing-http.mapper';

@ApiTags('personalization-sources')
@Controller()
@RequirePermissions(PERMISSIONS.DESIGN_SUBMIT_OWN)
export class SourcesController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-011] GET /api/v1/orders/:orderId/personalization-sources
  @Get('orders/:orderId/personalization-sources')
  @ApiListOrderSourcesDocs()
  async listOrderSources(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<PersonalizationSourceResponseDto[]> {
    const response = await this.personalizationClient.listOrderSources({
      actor: toVerifiedActor(principal),
      orderId,
    });
    return toPersonalizationSourceListResponse(response);
  }

  // [PERSO-012] GET /api/v1/personalization-sources/:sourceId/processing
  @Get('personalization-sources/:sourceId/processing')
  @ApiGetSourceProcessingDocs()
  async getSourceProcessing(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
  ): Promise<SourceProcessingResponseDto> {
    const response = await this.personalizationClient.getSourceProcessing({
      actor: toVerifiedActor(principal),
      sourceId,
    });
    return toSourceProcessingResponse(response);
  }

  // [PERSO-032] GET /api/v1/personalization-sources/:sourceId/wavecode
  @Get('personalization-sources/:sourceId/wavecode')
  @ApiGetWavecodeDocs()
  async getWavecode(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WavecodeResponseDto> {
    // Preview URLs are short-lived credentials: never cache them.
    response.setHeader('Cache-Control', 'no-store');
    return toWavecodeResponse(
      await this.personalizationClient.getSoundwaveWavecode({
        actor: toVerifiedActor(principal),
        sourceId,
      }),
    );
  }

  // [PERSO-033] POST /api/v1/personalization-sources/:sourceId/wavecode/style
  @Post('personalization-sources/:sourceId/wavecode/style')
  @HttpCode(HttpStatus.OK)
  @ApiSelectWavecodeStyleDocs()
  async selectWavecodeStyle(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() body: SelectWavecodeStyleRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WavecodeResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return toWavecodeResponse(
      await this.personalizationClient.selectWavecodeStyle({
        actor: toVerifiedActor(principal),
        sourceId,
        style: body.style,
      }),
    );
  }

  // [PERSO-035] POST /api/v1/personalization-sources/:sourceId/segment
  @Post('personalization-sources/:sourceId/segment')
  @HttpCode(HttpStatus.OK)
  @ApiResegmentSoundwaveDocs()
  async resegmentSoundwave(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() body: ResegmentSoundwaveRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WavecodeResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return toWavecodeResponse(
      await this.personalizationClient.resegmentSoundwaveSource({
        actor: toVerifiedActor(principal),
        sourceId,
        segmentStartMs: body.segmentStartMs,
        wavecodeStyle: body.wavecodeStyle,
      }),
    );
  }

  // [PERSO-034] POST /api/v1/personalization-sources/:sourceId/wavecode/accept
  @Post('personalization-sources/:sourceId/wavecode/accept')
  @HttpCode(HttpStatus.OK)
  @ApiAcceptWavecodeStyleDocs()
  async acceptWavecodeStyle(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() body: AcceptWavecodeStyleRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<WavecodeResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return toWavecodeResponse(
      await this.personalizationClient.acceptWavecodeStyle({
        actor: toVerifiedActor(principal),
        sourceId,
        style: body.style,
      }),
    );
  }
}
