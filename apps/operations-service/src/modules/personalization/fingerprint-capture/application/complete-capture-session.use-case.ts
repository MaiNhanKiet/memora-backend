import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type {
  CaptureSession,
  CompleteCaptureSessionRequest,
} from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
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
import { requireAttemptNo, requireUuid } from './capture.validation';

/**
 * PERSO-008 (revision 2026-11-15). The staff names the PENDING_REVIEW attempt to accept;
 * the repository applies it in one transaction. Object deletes of the other (now
 * rejected) attempts and the `end` command run after commit and never fail the request.
 */
@Injectable()
export class CompleteCaptureSessionUseCase {
  private readonly logger = new Logger(CompleteCaptureSessionUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(
    request: CompleteCaptureSessionRequest,
  ): Promise<CaptureSession> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    const sessionId = requireUuid(
      request.sessionId,
      CaptureReason.INVALID_SESSION_ID,
    );
    const attemptNo = requireAttemptNo(request.attemptNo);

    // Lazy expiry is persisted by findSession, so the EXPIRED state survives this error.
    const window = expiryWindow(this.config, new Date());
    const current = await this.sessions.findSession(sessionId, window);
    if (current === undefined) {
      throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
    }
    if (current.status === 'EXPIRED') {
      throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
    }

    const outcome = await this.sessions.completeSession({
      ...window,
      sessionId,
      attemptNo,
      staffUserId: actor.userId,
    });

    for (const rejected of outcome.rejected) {
      if (rejected.imageKey === undefined) {
        continue;
      }
      try {
        await this.storage.deleteObject(rejected.imageKey);
      } catch (error) {
        this.logger.warn(
          `Object ${rejected.imageKey} of rejected attempt could not be deleted: ${describe(error)}`,
        );
      }
    }
    if (outcome.completed) {
      this.logger.log(
        `Session completed: session=${sessionId} attemptNo=${attemptNo} staffUserId=${actor.userId}`,
      );
      try {
        await this.device.publishEnd(outcome.session.deviceCode, {
          type: 'end',
          sessionId,
          status: 'COMPLETED',
          acceptedAttemptNo: attemptNo,
        });
      } catch (error) {
        this.logger.error(
          `End for session ${sessionId} was not published: ${describe(error)}`,
        );
      }
    }
    return toCaptureSession(outcome.session, this.config);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
