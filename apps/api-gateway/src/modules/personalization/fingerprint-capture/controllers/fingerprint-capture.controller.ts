import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { CAPTURE_MAX_ATTEMPTS, PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import {
  ApiCompleteCaptureSessionDocs,
  ApiCreateCaptureSessionDocs,
  ApiGetCaptureAttemptImageDocs,
  ApiGetCaptureSessionDocs,
  ApiRejectCaptureAttemptDocs,
} from '../docs/fingerprint-capture.swagger';
import type { CaptureAttemptImageResponseDto } from '../dto/capture-attempt-image.response.dto';
import type { CaptureSessionResponseDto } from '../dto/capture-session.response.dto';
import { CompleteCaptureSessionRequestDto } from '../dto/complete-capture-session.request.dto';
import { CreateCaptureSessionRequestDto } from '../dto/create-capture-session.request.dto';
import { toCaptureAttemptImageResponse } from '../mappers/capture-attempt-image-http.mapper';
import { toCaptureSessionResponse } from '../mappers/capture-session-http.mapper';

const ATTEMPT_NO_MESSAGE = `attemptNo must be an integer between 1 and ${CAPTURE_MAX_ATTEMPTS}`;

/** Path `attemptNo`: an integer 1..CAPTURE_MAX_ATTEMPTS, otherwise 400. */
export class AttemptNoPipe extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: () => new BadRequestException(ATTEMPT_NO_MESSAGE),
    });
  }

  override async transform(
    value: string,
    metadata: Parameters<ParseIntPipe['transform']>[1],
  ): Promise<number> {
    const attemptNo = await super.transform(value, metadata);
    if (attemptNo < 1 || attemptNo > CAPTURE_MAX_ATTEMPTS) {
      throw new BadRequestException(ATTEMPT_NO_MESSAGE);
    }
    return attemptNo;
  }
}

@ApiTags('fingerprint-capture')
@Controller()
@RequirePermissions(PERMISSIONS.SOURCE_CAPTURE)
export class FingerprintCaptureController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-005] POST /api/v1/orders/:orderId/fingerprint/capture-sessions
  @Post('orders/:orderId/fingerprint/capture-sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCaptureSessionDocs()
  async createCaptureSession(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: CreateCaptureSessionRequestDto,
  ): Promise<CaptureSessionResponseDto> {
    const session = await this.personalizationClient.createCaptureSession({
      actor: toVerifiedActor(principal),
      orderId,
      consentId: body.consentId,
      deviceCode: body.deviceCode,
    });
    return toCaptureSessionResponse(session);
  }

  // [PERSO-006] GET /api/v1/fingerprint/capture-sessions/:sessionId
  @Get('fingerprint/capture-sessions/:sessionId')
  @ApiGetCaptureSessionDocs()
  async getCaptureSession(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ): Promise<CaptureSessionResponseDto> {
    const session = await this.personalizationClient.getCaptureSession({
      actor: toVerifiedActor(principal),
      sessionId,
    });
    return toCaptureSessionResponse(session);
  }

  // [PERSO-008] POST /api/v1/fingerprint/capture-sessions/:sessionId/complete
  @Post('fingerprint/capture-sessions/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiCompleteCaptureSessionDocs()
  async completeCaptureSession(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() body: CompleteCaptureSessionRequestDto,
  ): Promise<CaptureSessionResponseDto> {
    const session = await this.personalizationClient.completeCaptureSession({
      actor: toVerifiedActor(principal),
      sessionId,
      attemptNo: body.attemptNo,
    });
    return toCaptureSessionResponse(session);
  }

  // [PERSO-026] GET /api/v1/fingerprint/capture-sessions/:sessionId/attempts/:attemptNo/image
  @Get('fingerprint/capture-sessions/:sessionId/attempts/:attemptNo/image')
  @ApiGetCaptureAttemptImageDocs()
  async getCaptureAttemptImage(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('attemptNo', AttemptNoPipe) attemptNo: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CaptureAttemptImageResponseDto> {
    // The presigned URL is a short-lived credential: never cache it.
    response.setHeader('Cache-Control', 'no-store');
    const image = await this.personalizationClient.getCaptureAttemptImage({
      actor: toVerifiedActor(principal),
      sessionId,
      attemptNo,
    });
    return toCaptureAttemptImageResponse(image);
  }

  // [PERSO-027] POST /api/v1/fingerprint/capture-sessions/:sessionId/attempts/:attemptNo/reject
  @Post('fingerprint/capture-sessions/:sessionId/attempts/:attemptNo/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectCaptureAttemptDocs()
  async rejectCaptureAttempt(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('attemptNo', AttemptNoPipe) attemptNo: number,
  ): Promise<CaptureSessionResponseDto> {
    const session = await this.personalizationClient.rejectCaptureAttempt({
      actor: toVerifiedActor(principal),
      sessionId,
      attemptNo,
    });
    return toCaptureSessionResponse(session);
  }
}
