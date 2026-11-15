import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type {
  CaptureAttemptImage,
  GetCaptureAttemptImageRequest,
} from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import {
  CAPTURE_CONFIG,
  CAPTURE_IMAGE_CONTENT_TYPE,
  CAPTURE_IMAGE_URL_TTL_SECONDS,
  expiryWindow,
  type CaptureConfig,
} from './capture.config';
import { captureErrors, CaptureReason } from './capture.errors';
import {
  CAPTURE_REPOSITORY,
  type CaptureRepository,
} from './capture.repository';
import { requireAttemptNo, requireUuid } from './capture.validation';
import { isOpenStatus } from './evaluate-session-for-attempt';

/**
 * PERSO-026. The staff views a PENDING_REVIEW image to decide: a 60 s presigned URL
 * for an open session. The URL is returned only; it is never logged or stored.
 */
@Injectable()
export class GetCaptureAttemptImageUseCase {
  private readonly logger = new Logger(GetCaptureAttemptImageUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(
    request: GetCaptureAttemptImageRequest,
  ): Promise<CaptureAttemptImage> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    const sessionId = requireUuid(
      request.sessionId,
      CaptureReason.INVALID_SESSION_ID,
    );
    const attemptNo = requireAttemptNo(request.attemptNo);
    const session = await this.sessions.findSession(
      sessionId,
      expiryWindow(this.config, new Date()),
    );
    if (session === undefined) {
      throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
    }
    if (session.status === 'EXPIRED') {
      throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
    }
    if (!isOpenStatus(session.status)) {
      throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
    }
    const attempt = session.attempts.find(
      (candidate) => candidate.attemptNo === attemptNo,
    );
    if (attempt === undefined) {
      throw captureErrors.notFound(CaptureReason.ATTEMPT_NOT_FOUND);
    }
    if (attempt.result !== 'PENDING_REVIEW' || attempt.imageKey === undefined) {
      throw captureErrors.precondition(CaptureReason.ATTEMPT_NOT_REVIEWABLE);
    }

    const presigned = await this.storage.presignGet(attempt.imageKey, {
      expiresInSeconds: CAPTURE_IMAGE_URL_TTL_SECONDS,
      contentType: CAPTURE_IMAGE_CONTENT_TYPE,
    });
    this.logger.log(
      `Attempt image requested: session=${session.id} attemptNo=${attempt.attemptNo} staffUserId=${actor.userId}`,
    );
    return {
      attemptNo: attempt.attemptNo,
      imageUrl: presigned.url,
      expiresAt: presigned.expiresAt.toISOString(),
      contentType: CAPTURE_IMAGE_CONTENT_TYPE,
    };
  }
}
