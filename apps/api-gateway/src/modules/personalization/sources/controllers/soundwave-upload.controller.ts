import {
  Body,
  Controller,
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
  ApiCompleteSoundwaveUploadDocs,
  ApiInitiateSoundwaveUploadDocs,
} from '../docs/soundwave-upload.swagger';
import { CompleteSoundwaveUploadRequestDto } from '../dto/complete-soundwave-upload.request.dto';
import { InitiateSoundwaveUploadRequestDto } from '../dto/initiate-soundwave-upload.request.dto';
import type {
  CompleteSoundwaveUploadResponseDto,
  InitiateSoundwaveUploadResponseDto,
} from '../dto/soundwave-upload.response.dto';
import {
  toCompleteSoundwaveUploadResponse,
  toInitiateSoundwaveUploadResponse,
} from '../mappers/soundwave-upload-http.mapper';

@ApiTags('soundwave-upload')
@Controller('orders/:orderId/soundwave/uploads')
@RequirePermissions(PERMISSIONS.SOURCE_AUDIO_UPLOAD_OWN)
export class SoundwaveUploadController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-009] POST /api/v1/orders/:orderId/soundwave/uploads/initiate
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @ApiInitiateSoundwaveUploadDocs()
  async initiate(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: InitiateSoundwaveUploadRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<InitiateSoundwaveUploadResponseDto> {
    // The presigned URL is a short-lived credential: never cache it.
    response.setHeader('Cache-Control', 'no-store');
    const upload = await this.personalizationClient.initiateSoundwaveUpload({
      actor: toVerifiedActor(principal),
      orderId,
      consentId: body.consentId,
      contentType: body.contentType,
      sizeBytes: body.sizeBytes,
      sha256: body.sha256,
      origin: body.origin,
      durationMs: body.durationMs,
    });
    return toInitiateSoundwaveUploadResponse(upload);
  }

  // [PERSO-010] POST /api/v1/orders/:orderId/soundwave/uploads/complete
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @ApiCompleteSoundwaveUploadDocs()
  async complete(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CompleteSoundwaveUploadRequestDto,
  ): Promise<CompleteSoundwaveUploadResponseDto> {
    const source = await this.personalizationClient.completeSoundwaveUpload({
      actor: toVerifiedActor(principal),
      orderId,
      uploadId: body.uploadId,
      segmentStartMs: body.segmentStartMs,
    });
    return toCompleteSoundwaveUploadResponse(source);
  }
}
