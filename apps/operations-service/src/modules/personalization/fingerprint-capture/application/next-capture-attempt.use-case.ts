import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import {
  CAPTURE_MAX_ATTEMPTS,
  type CaptureSession,
  type NextCaptureAttemptRequest,
} from '@app/contracts';
import {
  CAPTURE_DEVICE_GATEWAY,
  type CaptureDeviceGateway,
} from './capture-device.gateway';
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
import { isOpenStatus } from './evaluate-session-for-attempt';
import { requireUuid } from './capture.validation';

/**
 * PERSO-028. The staff asks the device for another scan. Nothing is stored; after the
 * checks a `next` command is published. A publish failure is logged, not an error.
 */
@Injectable()
export class NextCaptureAttemptUseCase {
  private readonly logger = new Logger(NextCaptureAttemptUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(request: NextCaptureAttemptRequest): Promise<CaptureSession> {
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
    if (session.status === 'EXPIRED') {
      throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
    }
    if (!isOpenStatus(session.status)) {
      throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
    }
    if (session.attempts.some((attempt) => attempt.result === 'ACCEPTED')) {
      throw captureErrors.precondition(CaptureReason.ATTEMPT_ALREADY_ACCEPTED);
    }
    if (session.attempts.length >= CAPTURE_MAX_ATTEMPTS) {
      throw captureErrors.precondition(CaptureReason.MAX_ATTEMPTS_REACHED);
    }

    try {
      await this.device.publishNext(session.deviceCode, {
        type: 'next',
        sessionId,
        attemptNo: session.attempts.length + 1,
      });
    } catch (error) {
      this.logger.error(
        `Next for session ${sessionId} was not published: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
    return toCaptureSession(session, this.config);
  }
}
