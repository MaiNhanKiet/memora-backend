import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import {
  CAPTURE_MAX_ATTEMPTS,
  type CaptureSession,
  type RejectCaptureAttemptRequest,
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
import { CaptureReason } from './capture.errors';
import { toCaptureSession } from './capture.mapper';
import {
  CAPTURE_REPOSITORY,
  type CaptureRepository,
} from './capture.repository';
import { requireAttemptNo, requireUuid } from './capture.validation';

/**
 * PERSO-027. The staff rejects a PENDING_REVIEW image. The database change is one
 * transaction in the repository; the object delete and the device notifications run
 * after commit and never fail the request.
 */
@Injectable()
export class RejectCaptureAttemptUseCase {
  private readonly logger = new Logger(RejectCaptureAttemptUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(request: RejectCaptureAttemptRequest): Promise<CaptureSession> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    const sessionId = requireUuid(
      request.sessionId,
      CaptureReason.INVALID_SESSION_ID,
    );
    const attemptNo = requireAttemptNo(request.attemptNo);

    const { session, previous } = await this.sessions.rejectAttempt({
      ...expiryWindow(this.config, new Date()),
      sessionId,
      attemptNo,
      staffUserId: actor.userId,
      maxAttempts: CAPTURE_MAX_ATTEMPTS,
    });
    this.logger.log(
      `Attempt rejected: session=${session.id} attemptNo=${previous.attemptNo} staffUserId=${actor.userId}`,
    );

    if (previous.imageKey !== undefined) {
      try {
        await this.storage.deleteObject(previous.imageKey);
      } catch (error) {
        this.logger.warn(
          `Object ${previous.imageKey} of rejected attempt could not be deleted: ${describe(error)}`,
        );
      }
    }

    if (previous.nonce !== undefined) {
      try {
        await this.device.publishResult(session.deviceCode, {
          sessionId: session.id,
          nonce: previous.nonce,
          ok: true,
          attemptNo: previous.attemptNo,
          result: 'REJECTED',
          reason: 'STAFF_REJECTED',
          remainingAttempts: Math.max(
            0,
            CAPTURE_MAX_ATTEMPTS - session.attempts.length,
          ),
          sessionStatus: session.status,
        });
      } catch (error) {
        this.logger.error(
          `Reject result for session ${session.id} was not published: ${describe(error)}`,
        );
      }
    }
    if (session.status === 'FAILED') {
      try {
        await this.device.publishEnd(session.deviceCode, {
          type: 'end',
          sessionId: session.id,
          status: 'FAILED',
        });
      } catch (error) {
        this.logger.error(
          `End for session ${session.id} was not published: ${describe(error)}`,
        );
      }
    }
    return toCaptureSession(session, this.config);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
