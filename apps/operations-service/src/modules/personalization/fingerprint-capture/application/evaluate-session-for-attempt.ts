import type { DeviceErrorReason } from './capture.errors';
import type {
  CaptureAttemptRecord,
  CaptureSessionRecord,
} from './capture.repository';

export type SessionAttemptEvaluation =
  | { readonly kind: 'OK' }
  | { readonly kind: 'REPLAY'; readonly attempt: CaptureAttemptRecord }
  | { readonly kind: 'REFUSED'; readonly reason: DeviceErrorReason };

const OPEN_STATUSES = new Set(['CREATED', 'IN_PROGRESS']);

export function isOpenStatus(status: string): boolean {
  return OPEN_STATUSES.has(status);
}

/**
 * Pure decision shared by the use case (pre-check, before uploading) and the
 * repository (re-check inside the lock). Order matters: a device that does not own the
 * session learns nothing, and a replayed nonce is answered even after the session
 * moved on.
 */
export function evaluateSessionForAttempt(
  session: CaptureSessionRecord | undefined,
  deviceCode: string,
  nonce: string,
  expireCreatedBefore: Date,
  maxAttempts: number,
): SessionAttemptEvaluation {
  if (session === undefined) {
    return { kind: 'REFUSED', reason: 'SESSION_NOT_FOUND' };
  }
  if (session.deviceCode !== deviceCode) {
    return { kind: 'REFUSED', reason: 'DEVICE_MISMATCH' };
  }
  const replay = session.attempts.find((attempt) => attempt.nonce === nonce);
  if (replay !== undefined) {
    return { kind: 'REPLAY', attempt: replay };
  }
  if (session.status === 'EXPIRED') {
    return { kind: 'REFUSED', reason: 'SESSION_EXPIRED' };
  }
  if (session.status === 'FAILED') {
    return { kind: 'REFUSED', reason: 'MAX_ATTEMPTS_REACHED' };
  }
  if (!isOpenStatus(session.status)) {
    return { kind: 'REFUSED', reason: 'SESSION_NOT_OPEN' };
  }
  if (session.createdAt < expireCreatedBefore) {
    return { kind: 'REFUSED', reason: 'SESSION_EXPIRED' };
  }
  if (session.attempts.some((attempt) => attempt.result === 'ACCEPTED')) {
    return { kind: 'REFUSED', reason: 'ATTEMPT_ALREADY_ACCEPTED' };
  }
  // Several attempts may be PENDING_REVIEW at once (revision 2026-11-17).
  if (session.attempts.length >= maxAttempts) {
    return { kind: 'REFUSED', reason: 'MAX_ATTEMPTS_REACHED' };
  }
  return { kind: 'OK' };
}
