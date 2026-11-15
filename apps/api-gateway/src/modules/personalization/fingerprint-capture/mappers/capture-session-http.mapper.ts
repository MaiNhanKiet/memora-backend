import type { CaptureSession } from '@app/contracts';
import type { CaptureSessionResponseDto } from '../dto/capture-session.response.dto';

function orNull<T>(value: T | null | undefined): T | null {
  return value === undefined || value === null || value === '' ? null : value;
}

/**
 * Explicit public mapping; unset `acceptedSourceId`, `qualityScore` and `suggestion` become
 * null. Nothing else from the gRPC message is forwarded.
 */
export function toCaptureSessionResponse(
  session: CaptureSession,
): CaptureSessionResponseDto {
  return {
    sessionId: session.sessionId,
    orderId: session.orderId,
    consentId: session.consentId,
    deviceCode: session.deviceCode,
    status: session.status,
    attemptCount: session.attemptCount,
    maxAttempts: session.maxAttempts,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    acceptedSourceId: orNull(session.acceptedSourceId),
    attempts: session.attempts.map((attempt) => ({
      attemptNo: attempt.attemptNo,
      result: attempt.result,
      qualityScore: orNull(attempt.qualityScore),
      attemptedAt: attempt.attemptedAt,
      suggestion: orNull(attempt.suggestion),
    })),
  };
}
