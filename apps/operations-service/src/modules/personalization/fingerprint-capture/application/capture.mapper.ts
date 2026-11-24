import { CAPTURE_MAX_ATTEMPTS, type CaptureSession } from '@app/contracts';
import type { CaptureConfig } from './capture.config';
import type {
  CaptureAttemptRecord,
  CaptureSessionRecord,
} from './capture.repository';

/**
 * Record -> wire CaptureSession. Whitelist mapping: never copies images, asset keys,
 * checksums, nonces or staff ids. Expiry is created_at + TTL.
 */
export function toCaptureSession(
  record: CaptureSessionRecord,
  config: CaptureConfig,
): CaptureSession {
  return {
    sessionId: record.id,
    orderId: record.orderId,
    consentId: record.consentId,
    deviceCode: record.deviceCode,
    status: record.status,
    attemptCount: record.attempts.length,
    maxAttempts: CAPTURE_MAX_ATTEMPTS,
    expiresAt: sessionExpiresAt(record, config).toISOString(),
    createdAt: record.createdAt.toISOString(),
    ...(record.acceptedSourceId === null
      ? {}
      : { acceptedSourceId: record.acceptedSourceId }),
    attempts: record.attempts.map((attempt) => ({
      attemptNo: attempt.attemptNo,
      result: attempt.result,
      ...(attempt.qualityScore === null
        ? {}
        : { qualityScore: attempt.qualityScore }),
      attemptedAt: attempt.attemptedAt.toISOString(),
      ...suggestionField(attempt),
      ...(attempt.failureReason === null
        ? {}
        : { failureReason: attempt.failureReason }),
    })),
  };
}

export function sessionExpiresAt(
  record: CaptureSessionRecord,
  config: CaptureConfig,
): Date {
  return new Date(record.createdAt.getTime() + config.sessionTtlSeconds * 1000);
}

/** Threshold suggestion (PASS when score >= snapshot). Unset without both values. */
export function suggestionFor(
  qualityScore: number | null,
  threshold: number | null,
): 'PASS' | 'LOW_QUALITY' | undefined {
  if (qualityScore === null || threshold === null) {
    return undefined;
  }
  return qualityScore >= threshold ? 'PASS' : 'LOW_QUALITY';
}

function suggestionField(attempt: CaptureAttemptRecord): {
  suggestion?: 'PASS' | 'LOW_QUALITY';
} {
  const suggestion = suggestionFor(
    attempt.qualityScore,
    attempt.qualityThresholdSnapshot,
  );
  return suggestion === undefined ? {} : { suggestion };
}
