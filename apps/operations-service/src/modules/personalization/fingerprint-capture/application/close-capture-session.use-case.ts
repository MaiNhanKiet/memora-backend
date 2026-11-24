import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type {
  CaptureSession,
  CloseCaptureSessionRequest,
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
import { requireUuid } from './capture.validation';

/**
 * PERSO-029. The staff ends an open session without picking an image. The database
 * change is one transaction in the repository; object deletes and the `end` command run
 * after commit and never fail the request. Idempotent for a CANCELLED session.
 */
@Injectable()
export class CloseCaptureSessionUseCase {
  private readonly logger = new Logger(CloseCaptureSessionUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(CAPTURE_DEVICE_GATEWAY)
    private readonly device: CaptureDeviceGateway,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(request: CloseCaptureSessionRequest): Promise<CaptureSession> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    const sessionId = requireUuid(
      request.sessionId,
      CaptureReason.INVALID_SESSION_ID,
    );

    const outcome = await this.sessions.closeSession({
      ...expiryWindow(this.config, new Date()),
      sessionId,
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
          `Object ${rejected.imageKey} of a not selected attempt could not be deleted: ${describe(error)}`,
        );
      }
    }
    if (outcome.closed) {
      this.logger.log(
        `Session closed: session=${sessionId} staffUserId=${actor.userId}`,
      );
      try {
        await this.device.publishEnd(outcome.session.deviceCode, {
          type: 'end',
          sessionId,
          status: 'CANCELLED',
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
