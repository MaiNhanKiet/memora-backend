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
  ApiAcceptFingerprintArtworkDocs,
  ApiCreateFingerprintCropDocs,
  ApiGetFingerprintArtworkDocs,
} from '../docs/fingerprint-artwork.swagger';
import {
  AcceptFingerprintArtworkRequestDto,
  CreateFingerprintCropRequestDto,
  type FingerprintArtworkResponseDto,
} from '../dto/fingerprint-artwork.dto';
import { toFingerprintArtworkResponse } from '../mappers/fingerprint-artwork-http.mapper';

@ApiTags('fingerprint-artwork')
@Controller('personalization-sources/:sourceId/artwork')
@RequirePermissions(PERMISSIONS.DESIGN_SUBMIT_OWN)
export class FingerprintArtworkController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-037] GET /api/v1/personalization-sources/:sourceId/artwork
  @Get()
  @ApiGetFingerprintArtworkDocs()
  async getArtwork(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FingerprintArtworkResponseDto> {
    // Preview URLs are short-lived credentials: never cache them.
    response.setHeader('Cache-Control', 'no-store');
    return toFingerprintArtworkResponse(
      await this.personalizationClient.getFingerprintArtwork({
        actor: toVerifiedActor(principal),
        sourceId,
      }),
    );
  }

  // [PERSO-038] POST /api/v1/personalization-sources/:sourceId/artwork/crops
  @Post('crops')
  @HttpCode(HttpStatus.OK)
  @ApiCreateFingerprintCropDocs()
  async createCrop(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() body: CreateFingerprintCropRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FingerprintArtworkResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return toFingerprintArtworkResponse(
      await this.personalizationClient.createFingerprintCrop({
        actor: toVerifiedActor(principal),
        sourceId,
        shape: body.shape,
        offsetX: body.offsetX,
        offsetY: body.offsetY,
        zoom: body.zoom,
        eraseStrokes: (body.eraseStrokes ?? []).map((stroke) => ({
          radius: stroke.radius,
          points: stroke.points.map(([x, y]) => ({ x, y })),
        })),
      }),
    );
  }

  // [PERSO-039] POST /api/v1/personalization-sources/:sourceId/artwork/accept
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiAcceptFingerprintArtworkDocs()
  async acceptArtwork(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() body: AcceptFingerprintArtworkRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<FingerprintArtworkResponseDto> {
    response.setHeader('Cache-Control', 'no-store');
    return toFingerprintArtworkResponse(
      await this.personalizationClient.acceptFingerprintArtwork({
        actor: toVerifiedActor(principal),
        sourceId,
        versionId: body.versionId,
      }),
    );
  }
}
