import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CAPTURE_MAX_ATTEMPTS } from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import type {
  DeviceErrorResult,
  DeviceResult,
  EndCommand,
} from './capture-device.gateway';
import {
  CAPTURE_CONFIG,
  CAPTURE_IMAGE_CONTENT_TYPE,
  CAPTURE_MAX_IMAGE_BYTES,
  expiryWindow,
  type CaptureConfig,
} from './capture.config';
import type { DeviceErrorReason } from './capture.errors';
import {
  CAPTURE_REPOSITORY,
  type CaptureAttemptRecord,
  type CaptureRepository,
  type CaptureSessionRecord,
  type RecordAttemptOutcome,
} from './capture.repository';
import { suggestionFor } from './capture.mapper';
import { evaluateSessionForAttempt } from './evaluate-session-for-attempt';

/** A device attempt after the MQTT adapter validated its shape. `deviceCode` is from the topic. */
export interface DeviceAttemptMessage {
  readonly deviceCode: string;
  readonly sessionId: string;
  readonly nonce: string;
  readonly qualityScore: number;
  readonly imageBase64: string | undefined;
  readonly firmwareVersion: string | undefined;
}

/** The result for the device, plus the `end` command when this attempt failed the session. */
export interface RecordAttemptReply {
  readonly result: DeviceResult;
  readonly end?: EndCommand;
}

const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
const MAX_BASE64_LENGTH = Math.ceil(CAPTURE_MAX_IMAGE_BYTES / 3) * 4;

/**
 * PERSO-007 (revision 2026-11-15). Always resolves with a reply for the device; domain
 * refusals are results, not exceptions. A valid image is stored and recorded as
 * PENDING_REVIEW (the quality threshold is only a suggestion, the staff decides); no
 * image is a CAPTURE_FAILED rejection. The image is uploaded before the insert and
 * deleted again (best effort) when the insert does not record it.
 */
@Injectable()
export class RecordCaptureAttemptUseCase {
  private readonly logger = new Logger(RecordCaptureAttemptUseCase.name);

  constructor(
    @Inject(CAPTURE_REPOSITORY) private readonly sessions: CaptureRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(CAPTURE_CONFIG) private readonly config: CaptureConfig,
  ) {}

  async execute(message: DeviceAttemptMessage): Promise<RecordAttemptReply> {
    try {
      return await this.handle(message);
    } catch (error) {
      this.logger.error(
        `Attempt for session ${message.sessionId} failed: ${describe(error)}`,
      );
      return { result: refused(message, 'INTERNAL_ERROR') };
    }
  }

  private async handle(
    message: DeviceAttemptMessage,
  ): Promise<RecordAttemptReply> {
    const window = expiryWindow(this.config, new Date());
    const session = await this.sessions.findSession(message.sessionId, window);
    const evaluation = evaluateSessionForAttempt(
      session,
      message.deviceCode,
      message.nonce,
      window.expireCreatedBefore,
      CAPTURE_MAX_ATTEMPTS,
    );
    if (evaluation.kind === 'REFUSED') {
      return { result: refused(message, evaluation.reason) };
    }
    if (session === undefined) {
      return { result: refused(message, 'SESSION_NOT_FOUND') };
    }
    if (evaluation.kind === 'REPLAY') {
      // QoS 1 redelivery: answer with the recorded attempt, record nothing.
      return {
        result: okResult(message, evaluation.attempt, session?.status ?? ''),
      };
    }

    if (
      message.imageBase64 !== undefined &&
      message.imageBase64.length > MAX_BASE64_LENGTH
    ) {
      return { result: refused(message, 'IMAGE_TOO_LARGE') };
    }

    let upload: UploadedImage | undefined;
    const attemptId = randomUUID();
    const bytes = decodeImage(message.imageBase64);
    if (bytes === 'INVALID') {
      return { result: refused(message, 'INVALID_MESSAGE') };
    }
    if (bytes !== 'MISSING') {
      if (bytes.byteLength > CAPTURE_MAX_IMAGE_BYTES) {
        return { result: refused(message, 'IMAGE_TOO_LARGE') };
      }
      if (!isBmp(bytes)) {
        return { result: refused(message, 'INVALID_MESSAGE') };
      }
      upload = await this.upload(
        session.orderId,
        message.sessionId,
        attemptId,
        bytes,
      );
    }

    let outcome: RecordAttemptOutcome;
    try {
      outcome = await this.sessions.recordAttempt({
        ...window,
        sessionId: message.sessionId,
        deviceCode: message.deviceCode,
        attemptId,
        nonce: message.nonce,
        qualityScore: upload === undefined ? null : message.qualityScore,
        qualityThreshold:
          upload === undefined ? null : this.config.qualityThreshold,
        result: upload === undefined ? 'REJECTED' : 'PENDING_REVIEW',
        maxAttempts: CAPTURE_MAX_ATTEMPTS,
        firmwareVersion: message.firmwareVersion,
        image: upload,
      });
    } catch (error) {
      await this.discard(upload);
      throw error;
    }

    if (outcome.kind !== 'RECORDED') {
      // Refused or replayed inside the lock (a parallel message won): drop our object.
      await this.discard(upload);
    }
    if (outcome.kind === 'REFUSED') {
      return { result: refused(message, outcome.reason) };
    }
    const result = okResult(message, outcome.attempt, outcome.session.status);
    if (outcome.kind === 'RECORDED' && outcome.session.status === 'FAILED') {
      return {
        result,
        end: { type: 'end', sessionId: message.sessionId, status: 'FAILED' },
      };
    }
    return { result };
  }

  private async upload(
    orderId: string,
    sessionId: string,
    attemptId: string,
    bytes: Buffer,
  ): Promise<UploadedImage> {
    const key = fingerprintAttemptKey(orderId, sessionId, attemptId);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    await this.storage.putObject(
      key,
      bytes,
      sha256,
      CAPTURE_IMAGE_CONTENT_TYPE,
    );
    return { key, sha256, bytes: bytes.byteLength };
  }

  private async discard(upload: UploadedImage | undefined): Promise<void> {
    if (upload === undefined) {
      return;
    }
    try {
      await this.storage.deleteObject(upload.key);
    } catch (error) {
      this.logger.warn(
        `Orphan object ${upload.key} could not be deleted: ${describe(error)}`,
      );
    }
  }
}

interface UploadedImage {
  readonly key: string;
  readonly sha256: string;
  readonly bytes: number;
}

/**
 * Raw AS608 image key. The attempt number is assigned inside the `capture-session` lock
 * after the upload, so it is neither known nor unique here; the attempt id is. The key
 * is order/session scoped.
 */
export function fingerprintAttemptKey(
  orderId: string,
  sessionId: string,
  attemptId: string,
): string {
  return `personalization/fingerprint/${orderId}/sessions/${sessionId}/attempt-${attemptId}.bmp`;
}

/** BMP magic `BM` and the little-endian file size at offset 2 equal to the byte length. */
export function isBmp(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 6 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) {
    return false;
  }
  const declared = Buffer.from(bytes.buffer, bytes.byteOffset, 6).readUInt32LE(
    2,
  );
  return declared === bytes.byteLength;
}

function decodeImage(
  base64: string | undefined,
): Buffer | 'MISSING' | 'INVALID' {
  if (base64 === undefined || base64.length === 0) {
    return 'MISSING';
  }
  if (base64.length % 4 !== 0 || !BASE64.test(base64)) {
    return 'INVALID';
  }
  const bytes = Buffer.from(base64, 'base64');
  return bytes.byteLength === 0 ? 'MISSING' : bytes;
}

function refused(
  message: DeviceAttemptMessage,
  error: DeviceErrorReason,
): DeviceErrorResult {
  return {
    sessionId: message.sessionId,
    nonce: message.nonce,
    ok: false,
    error,
  };
}

function okResult(
  message: DeviceAttemptMessage,
  attempt: CaptureAttemptRecord,
  sessionStatus: CaptureSessionRecord['status'],
): DeviceResult {
  const suggestion =
    attempt.result === 'PENDING_REVIEW'
      ? suggestionFor(attempt.qualityScore, attempt.qualityThresholdSnapshot)
      : undefined;
  return {
    sessionId: message.sessionId,
    nonce: message.nonce,
    ok: true,
    attemptNo: attempt.attemptNo,
    result: attempt.result,
    ...(suggestion === undefined ? {} : { suggestion }),
    remainingAttempts:
      attempt.result === 'ACCEPTED'
        ? 0
        : Math.max(0, CAPTURE_MAX_ATTEMPTS - attempt.attemptNo),
    sessionStatus,
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
