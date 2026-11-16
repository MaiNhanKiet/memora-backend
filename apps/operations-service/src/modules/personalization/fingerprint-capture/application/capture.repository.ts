import type { DeviceErrorReason } from './capture.errors';

export type SourcePlanModeSnapshot = 'N/A' | 'SHARED' | 'SEPARATE';

/** Consent facts the capture feature needs. Never carries evidence_metadata_json. */
export interface ConsentCaptureRecord {
  readonly id: string;
  readonly orderId: string;
  readonly consentType: string;
  readonly status: string;
  readonly ringItemIds: readonly string[];
}

/** Internal attempt view. nonce, imageKey and imageSha256 never reach a response. */
export interface CaptureAttemptRecord {
  readonly id: string;
  readonly attemptNo: number;
  readonly result: string;
  readonly qualityScore: number | null;
  readonly qualityThresholdSnapshot: number | null;
  readonly attemptedAt: Date;
  readonly nonce: string | undefined;
  readonly imageKey: string | undefined;
  readonly imageSha256: string | undefined;
}

export interface CaptureSessionRecord {
  readonly id: string;
  readonly orderId: string;
  readonly consentId: string;
  readonly deviceCode: string;
  readonly status: string;
  readonly sourcePlanMode: string;
  readonly staffUserId: string;
  readonly acceptedSourceId: string | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly endedAt: Date | null;
  /** Ordered by attemptNo ascending. */
  readonly attempts: readonly CaptureAttemptRecord[];
}

/** Lazy expiry: an open session created before `expireCreatedBefore` becomes EXPIRED. */
export interface ExpiryWindow {
  readonly now: Date;
  readonly expireCreatedBefore: Date;
}

export interface CreateCaptureSessionInput extends ExpiryWindow {
  readonly orderId: string;
  readonly consentId: string;
  readonly deviceCode: string;
  readonly staffUserId: string;
  readonly sourcePlanMode: SourcePlanModeSnapshot;
}

export interface RecordAttemptInput extends ExpiryWindow {
  readonly sessionId: string;
  readonly deviceCode: string;
  /** Pre-generated so the object key can use it before the insert. */
  readonly attemptId: string;
  readonly nonce: string;
  /** Null for a CAPTURE_FAILED attempt (the device sent no image). */
  readonly qualityScore: number | null;
  readonly qualityThreshold: number | null;
  /** PENDING_REVIEW (stored image, staff decides) or REJECTED (CAPTURE_FAILED, no image). */
  readonly result: 'PENDING_REVIEW' | 'REJECTED';
  readonly maxAttempts: number;
  readonly firmwareVersion: string | undefined;
  readonly image:
    | { readonly key: string; readonly sha256: string; readonly bytes: number }
    | undefined;
}

export type RecordAttemptOutcome =
  | {
      readonly kind: 'RECORDED';
      readonly session: CaptureSessionRecord;
      readonly attempt: CaptureAttemptRecord;
    }
  | {
      readonly kind: 'REPLAY';
      readonly session: CaptureSessionRecord;
      readonly attempt: CaptureAttemptRecord;
    }
  | { readonly kind: 'REFUSED'; readonly reason: DeviceErrorReason };

export interface CompleteCaptureSessionInput extends ExpiryWindow {
  readonly sessionId: string;
  readonly attemptNo: number;
  readonly staffUserId: string;
}

export interface CompleteCaptureSessionOutcome {
  readonly session: CaptureSessionRecord;
  /** True when this call completed the session; false for an idempotent repeat. */
  readonly completed: boolean;
  /** Other PENDING_REVIEW attempts that became REJECTED; their objects are deleted after commit. */
  readonly rejected: readonly CaptureAttemptRecord[];
}

export interface RejectCaptureAttemptInput extends ExpiryWindow {
  readonly sessionId: string;
  readonly attemptNo: number;
  readonly staffUserId: string;
  readonly maxAttempts: number;
}

export interface RejectCaptureAttemptOutcome {
  readonly session: CaptureSessionRecord;
  /** The attempt as it was before the reject (carries the nonce and the image key to delete). */
  readonly previous: CaptureAttemptRecord;
}

export interface CaptureRepository {
  findConsent(consentId: string): Promise<ConsentCaptureRecord | undefined>;

  /**
   * One transaction under advisory locks on the consent and on the device: expires
   * stale open sessions of both, re-checks the consent is still ACCEPTED
   * (CONSENT_NOT_ACCEPTED), refuses a consent that already has a COMPLETED session
   * (SOURCE_ALREADY_CAPTURED) and an open session on the consent or device
   * (SESSION_ALREADY_OPEN), then inserts a CREATED session.
   */
  createSession(
    input: CreateCaptureSessionInput,
  ): Promise<CaptureSessionRecord>;

  /** Applies lazy expiry (persisted) before returning. Undefined when it does not exist. */
  findSession(
    sessionId: string,
    window: ExpiryWindow,
  ): Promise<CaptureSessionRecord | undefined>;

  /** The open (non-expired CREATED or IN_PROGRESS) session of a device, if any. */
  findOpenSessionForDevice(
    deviceCode: string,
    window: ExpiryWindow,
  ): Promise<CaptureSessionRecord | undefined>;

  /**
   * One transaction under an advisory lock on the session: re-evaluates the session
   * for the attempt, replays an already recorded nonce, allocates attempt_no, inserts
   * the attempt and moves the session to IN_PROGRESS or FAILED.
   */
  recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptOutcome>;

  /**
   * One transaction under an advisory lock on the session (PERSO-008). The chosen
   * PENDING_REVIEW attempt becomes ACCEPTED, the other PENDING_REVIEW attempts become
   * REJECTED (STAFF_REJECTED). Idempotent for a COMPLETED session with the same
   * attemptNo; another attemptNo is SESSION_NOT_OPEN. Throws the CaptureReason errors.
   */
  completeSession(
    input: CompleteCaptureSessionInput,
  ): Promise<CompleteCaptureSessionOutcome>;

  /**
   * One transaction under an advisory lock on the session (PERSO-027). Throws
   * SESSION_NOT_FOUND, SESSION_EXPIRED, SESSION_NOT_OPEN, ATTEMPT_NOT_FOUND or
   * ATTEMPT_NOT_REVIEWABLE. The PENDING_REVIEW attempt becomes REJECTED
   * (STAFF_REJECTED, image reference dropped); the session becomes FAILED when all
   * attempts are used and none is pending or accepted, else stays IN_PROGRESS.
   */
  rejectAttempt(
    input: RejectCaptureAttemptInput,
  ): Promise<RejectCaptureAttemptOutcome>;
}

export const CAPTURE_REPOSITORY = Symbol('CAPTURE_REPOSITORY');
