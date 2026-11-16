import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type { CaptureSession, GetCaptureSessionRequest } from '@app/contracts';
import {
  CAPTURE_CONFIG,
  expiryWindow,
  type CaptureConfig,
} from './capture.config';
import { captureErrors, CaptureReason } from './capture.errors';
import { toCaptureSession } from './capture.mapper';
import {
  CAPTURE_REPOSITORY,
  type CaptureRepository,
} from './capture.repository';
import { requireUuid } from './capture.validation';

/**
 * PERSO-006. Any user with SOURCE_CAPTURE may read any session (D-P-11: no store
 * scoping). Applies lazy expiry. The mapper never returns biometric data.
 */
@Injectable()
export class GetCaptureSessionUseCase {
  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(request: GetCaptureSessionRequest): Promise<CaptureSession> {
    requireUserActor(parseVerifiedActor(request.actor));
    const sessionId = requireUuid(
      request.sessionId,
      CaptureReason.INVALID_SESSION_ID,
    );
    const session = await this.sessions.findSession(
      sessionId,
      expiryWindow(this.config, new Date()),
    );
    if (session === undefined) {
      throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
    }
    return toCaptureSession(session, this.config);
  }
}
