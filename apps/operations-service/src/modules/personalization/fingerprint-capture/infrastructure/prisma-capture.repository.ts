import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import { captureErrors, CaptureReason } from '../application/capture.errors';
import type {
  CaptureAttemptRecord,
  CaptureRepository,
  CaptureSessionRecord,
  CloseCaptureSessionInput,
  CloseCaptureSessionOutcome,
  CompleteCaptureSessionInput,
  CompleteCaptureSessionOutcome,
  ConsentCaptureRecord,
  CreateCaptureSessionInput,
  ExpiryWindow,
  RecordAttemptInput,
  RecordAttemptOutcome,
  RejectCaptureAttemptInput,
  RejectCaptureAttemptOutcome,
} from '../application/capture.repository';
import { evaluateSessionForAttempt } from '../application/evaluate-session-for-attempt';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const OPEN = ['CREATED', 'IN_PROGRESS'];

const WITH_ATTEMPTS = {
  capture_attempts: { orderBy: { attempt_no: 'asc' } },
} as const;

interface AttemptRow {
  id: string;
  attempt_no: number;
  quality_score: { toString(): string } | null;
  quality_threshold_snapshot: { toString(): string } | null;
  result: string;
  failure_reason: string | null;
  attempted_at: Date;
  metadata_json: unknown;
}

interface SessionRow {
  id: string;
  order_id: string;
  consent_id: string;
  source_plan_mode: string;
  device_code: string | null;
  staff_user_id: string;
  status: string;
  accepted_source_id: string | null;
  started_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  capture_attempts: AttemptRow[];
}

@Injectable()
export class PrismaCaptureRepository implements CaptureRepository {
  private readonly logger = new Logger(PrismaCaptureRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
  ) {}

  /**
   * Runs `work` in one transaction. `expiredKeys` collects the image keys of attempts
   * that lazy expiry rejected; they are deleted only after the transaction committed
   * (best effort, logged on failure).
   */
  private async transact<T>(
    work: (tx: Tx, expiredKeys: string[]) => Promise<T>,
  ): Promise<T> {
    const keys: string[] = [];
    const result = await this.prisma.$transaction(async (tx) => {
      keys.length = 0;
      return work(tx, keys);
    });
    await this.deleteObjects(keys);
    return result;
  }

  private async deleteObjects(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      try {
        await this.storage.deleteObject(key);
      } catch (error) {
        this.logger.warn(
          `Object ${key} of an expired attempt could not be deleted: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  async findConsent(
    consentId: string,
  ): Promise<ConsentCaptureRecord | undefined> {
    const row = await this.prisma.consents.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        order_id: true,
        consent_type: true,
        status: true,
        consent_ring_items: { select: { ring_item_id: true } },
      },
    });
    if (row === null) {
      return undefined;
    }
    return {
      id: row.id,
      orderId: row.order_id ?? '',
      consentType: row.consent_type,
      status: row.status,
      ringItemIds: row.consent_ring_items.map((item) => item.ring_item_id),
    };
  }

  createSession(
    input: CreateCaptureSessionInput,
  ): Promise<CaptureSessionRecord> {
    return this.transact(async (tx, expiredKeys) => {
      // Fixed order (consent, then device) so two creators cannot deadlock.
      await lock(tx, `capture-consent:${input.consentId}`);
      await lock(tx, `capture-device:${input.deviceCode}`);

      expiredKeys.push(
        ...(await expireStale(
          tx,
          {
            OR: [
              { consent_id: input.consentId },
              { device_code: input.deviceCode },
            ],
          },
          input,
        )),
      );

      const consent = await tx.consents.findUnique({
        where: { id: input.consentId },
        select: { status: true },
      });
      if (consent === null || consent.status !== 'ACCEPTED') {
        throw captureErrors.precondition(CaptureReason.CONSENT_NOT_ACCEPTED);
      }
      const completed = await tx.capture_sessions.findFirst({
        where: { consent_id: input.consentId, status: 'COMPLETED' },
        select: { id: true },
      });
      if (completed !== null) {
        throw captureErrors.alreadyExists(
          CaptureReason.SOURCE_ALREADY_CAPTURED,
        );
      }
      const open = await tx.capture_sessions.findFirst({
        where: {
          status: { in: OPEN },
          OR: [
            { consent_id: input.consentId },
            { device_code: input.deviceCode },
          ],
        },
        select: { id: true },
      });
      if (open !== null) {
        throw captureErrors.alreadyExists(CaptureReason.SESSION_ALREADY_OPEN);
      }

      const created = await tx.capture_sessions.create({
        data: {
          order_id: input.orderId,
          consent_id: input.consentId,
          source_plan_mode: input.sourcePlanMode,
          device_code: input.deviceCode,
          staff_user_id: input.staffUserId,
          status: 'CREATED',
          created_at: input.now,
        },
        include: WITH_ATTEMPTS,
      });
      return toSession(created);
    });
  }

  async findSession(
    sessionId: string,
    window: ExpiryWindow,
  ): Promise<CaptureSessionRecord | undefined> {
    return this.transact(async (tx, expiredKeys) => {
      expiredKeys.push(...(await expireStale(tx, { id: sessionId }, window)));
      const row = await tx.capture_sessions.findUnique({
        where: { id: sessionId },
        include: WITH_ATTEMPTS,
      });
      return row === null ? undefined : toSession(row);
    });
  }

  async findOpenSessionForDevice(
    deviceCode: string,
    window: ExpiryWindow,
  ): Promise<CaptureSessionRecord | undefined> {
    return this.transact(async (tx, expiredKeys) => {
      expiredKeys.push(
        ...(await expireStale(tx, { device_code: deviceCode }, window)),
      );
      const row = await tx.capture_sessions.findFirst({
        where: { device_code: deviceCode, status: { in: OPEN } },
        orderBy: { created_at: 'desc' },
        include: WITH_ATTEMPTS,
      });
      return row === null ? undefined : toSession(row);
    });
  }

  recordAttempt(input: RecordAttemptInput): Promise<RecordAttemptOutcome> {
    return this.transact(async (tx, expiredKeys) => {
      await lock(tx, `capture-session:${input.sessionId}`);

      // Persist expiry before deciding, so EXPIRED is committed with the refusal.
      expiredKeys.push(
        ...(await expireStale(tx, { id: input.sessionId }, input)),
      );
      const row = await tx.capture_sessions.findUnique({
        where: { id: input.sessionId },
        include: WITH_ATTEMPTS,
      });
      const session = row === null ? undefined : toSession(row);
      const evaluation = evaluateSessionForAttempt(
        session,
        input.deviceCode,
        input.nonce,
        input.expireCreatedBefore,
        input.maxAttempts,
      );
      if (session === undefined || evaluation.kind === 'REFUSED') {
        return {
          kind: 'REFUSED',
          reason:
            evaluation.kind === 'REFUSED'
              ? evaluation.reason
              : 'SESSION_NOT_FOUND',
        } as const;
      }
      if (evaluation.kind === 'REPLAY') {
        return {
          kind: 'REPLAY',
          session,
          attempt: evaluation.attempt,
        } as const;
      }

      const attemptNo = session.attempts.length + 1;
      await tx.capture_attempts.create({
        data: {
          id: input.attemptId,
          capture_session_id: input.sessionId,
          attempt_no: attemptNo,
          quality_score: input.qualityScore,
          quality_threshold_snapshot: input.qualityThreshold,
          result: input.result,
          failure_reason: input.result === 'REJECTED' ? 'CAPTURE_FAILED' : null,
          metadata_json: {
            nonce: input.nonce,
            ...(input.firmwareVersion === undefined
              ? {}
              : { firmwareVersion: input.firmwareVersion }),
            ...(input.image === undefined
              ? {}
              : {
                  imageKey: input.image.key,
                  imageSha256: input.image.sha256,
                  imageBytes: input.image.bytes,
                }),
          },
          attempted_at: input.now,
        },
      });

      // None is ACCEPTED here. Several attempts may be PENDING_REVIEW; the session fails
      // only when every attempt is used and none is waiting for the staff.
      const nonePending = !session.attempts.some(
        (attempt) => attempt.result === 'PENDING_REVIEW',
      );
      const exhausted =
        input.result === 'REJECTED' &&
        nonePending &&
        attemptNo >= input.maxAttempts;
      await tx.capture_sessions.updateMany({
        where: { id: input.sessionId, status: { in: OPEN } },
        data: {
          status: exhausted ? 'FAILED' : 'IN_PROGRESS',
          started_at: session.startedAt ?? input.now,
          ...(exhausted
            ? { ended_at: input.now, failure_reason: 'MAX_ATTEMPTS_REACHED' }
            : {}),
        },
      });

      const reloaded = await tx.capture_sessions.findUniqueOrThrow({
        where: { id: input.sessionId },
        include: WITH_ATTEMPTS,
      });
      const updated = toSession(reloaded);
      const attempt = updated.attempts.find(
        (candidate) => candidate.id === input.attemptId,
      );
      if (attempt === undefined) {
        throw new Error('Recorded attempt was not found after insert');
      }
      return { kind: 'RECORDED', session: updated, attempt } as const;
    });
  }

  completeSession(
    input: CompleteCaptureSessionInput,
  ): Promise<CompleteCaptureSessionOutcome> {
    return this.prisma.$transaction(async (tx) => {
      await lock(tx, `capture-session:${input.sessionId}`);
      const row = await tx.capture_sessions.findUnique({
        where: { id: input.sessionId },
        include: WITH_ATTEMPTS,
      });
      if (row === null) {
        throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
      }
      const session = toSession(row);
      if (session.status === 'COMPLETED') {
        // Idempotent only for the attempt that was accepted.
        const accepted = session.attempts.find(
          (attempt) => attempt.result === 'ACCEPTED',
        );
        if (accepted?.attemptNo !== input.attemptNo) {
          throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
        }
        return { session, completed: false, rejected: [] };
      }
      if (session.status === 'EXPIRED') {
        throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
      }
      if (!OPEN.includes(session.status)) {
        throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
      }
      if (session.createdAt < input.expireCreatedBefore) {
        throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
      }

      const consent = await tx.consents.findUnique({
        where: { id: session.consentId },
        select: { status: true, customer_identity_id: true },
      });
      if (consent === null || consent.status !== 'ACCEPTED') {
        throw captureErrors.precondition(CaptureReason.CONSENT_NOT_ACCEPTED);
      }
      const chosen = session.attempts.find(
        (attempt) => attempt.attemptNo === input.attemptNo,
      );
      if (chosen === undefined) {
        throw captureErrors.notFound(CaptureReason.ATTEMPT_NOT_FOUND);
      }
      if (
        chosen.result !== 'PENDING_REVIEW' ||
        chosen.imageKey === undefined ||
        chosen.imageSha256 === undefined
      ) {
        throw captureErrors.precondition(CaptureReason.ATTEMPT_NOT_REVIEWABLE);
      }

      const source = await tx.personalization_sources.create({
        data: {
          owner_customer_identity_id: consent.customer_identity_id,
          source_type: 'FINGERPRINT',
          status: 'ACCEPTED',
          raw_asset_key: chosen.imageKey,
          raw_checksum: chosen.imageSha256,
          captured_or_uploaded_by_user_id: input.staffUserId,
          captured_at: chosen.attemptedAt,
          accepted_at: input.now,
        },
        select: { id: true },
      });
      // Conditional on the open status: a parallel complete creates no second source.
      const updated = await tx.capture_sessions.updateMany({
        where: { id: session.id, status: { in: OPEN } },
        data: {
          status: 'COMPLETED',
          accepted_source_id: source.id,
          ended_at: input.now,
        },
      });
      if (updated.count !== 1) {
        throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
      }
      await tx.consents.update({
        where: { id: session.consentId },
        data: { personalization_source_id: source.id },
      });

      const rawOf = (id: string): unknown =>
        row.capture_attempts.find((attempt) => attempt.id === id)
          ?.metadata_json;
      await tx.capture_attempts.update({
        where: { id: chosen.id },
        data: {
          result: 'ACCEPTED',
          failure_reason: null,
          metadata_json: {
            ...metadataRecord(rawOf(chosen.id)),
            acceptedByUserId: input.staffUserId,
            acceptedAt: input.now.toISOString(),
          },
        },
      });
      const rejected = session.attempts.filter(
        (attempt) =>
          attempt.id !== chosen.id && attempt.result === 'PENDING_REVIEW',
      );
      for (const attempt of rejected) {
        await tx.capture_attempts.update({
          where: { id: attempt.id },
          data: {
            result: 'REJECTED',
            failure_reason: 'NOT_SELECTED',
            metadata_json: rejectedMetadata(
              rawOf(attempt.id),
              input.staffUserId,
              input.now,
            ),
          },
        });
      }

      const reloaded = await tx.capture_sessions.findUniqueOrThrow({
        where: { id: session.id },
        include: WITH_ATTEMPTS,
      });
      return { session: toSession(reloaded), completed: true, rejected };
    });
  }

  rejectAttempt(
    input: RejectCaptureAttemptInput,
  ): Promise<RejectCaptureAttemptOutcome> {
    return this.transact(async (tx, expiredKeys) => {
      await lock(tx, `capture-session:${input.sessionId}`);
      expiredKeys.push(
        ...(await expireStale(tx, { id: input.sessionId }, input)),
      );
      const row = await tx.capture_sessions.findUnique({
        where: { id: input.sessionId },
        include: WITH_ATTEMPTS,
      });
      if (row === null) {
        throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
      }
      const session = toSession(row);
      if (session.status === 'EXPIRED') {
        throw captureErrors.precondition(CaptureReason.SESSION_EXPIRED);
      }
      if (!OPEN.includes(session.status)) {
        throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
      }
      const previous = session.attempts.find(
        (attempt) => attempt.attemptNo === input.attemptNo,
      );
      const rawRow = row.capture_attempts.find(
        (attempt) => attempt.id === previous?.id,
      );
      if (previous === undefined || rawRow === undefined) {
        throw captureErrors.notFound(CaptureReason.ATTEMPT_NOT_FOUND);
      }
      if (previous.result !== 'PENDING_REVIEW') {
        throw captureErrors.precondition(CaptureReason.ATTEMPT_NOT_REVIEWABLE);
      }

      await tx.capture_attempts.update({
        where: { id: previous.id },
        data: {
          result: 'REJECTED',
          failure_reason: 'STAFF_REJECTED',
          metadata_json: rejectedMetadata(
            rawRow.metadata_json,
            input.staffUserId,
            input.now,
          ),
        },
      });

      const nonePending = !session.attempts.some(
        (attempt) =>
          attempt.id !== previous.id && attempt.result === 'PENDING_REVIEW',
      );
      if (session.attempts.length >= input.maxAttempts && nonePending) {
        await tx.capture_sessions.updateMany({
          where: { id: session.id, status: { in: OPEN } },
          data: {
            status: 'FAILED',
            ended_at: input.now,
            failure_reason: 'MAX_ATTEMPTS_REACHED',
          },
        });
      }

      const reloaded = await tx.capture_sessions.findUniqueOrThrow({
        where: { id: session.id },
        include: WITH_ATTEMPTS,
      });
      return { session: toSession(reloaded), previous };
    });
  }

  closeSession(
    input: CloseCaptureSessionInput,
  ): Promise<CloseCaptureSessionOutcome> {
    return this.transact(async (tx, expiredKeys) => {
      await lock(tx, `capture-session:${input.sessionId}`);
      expiredKeys.push(
        ...(await expireStale(tx, { id: input.sessionId }, input)),
      );
      const row = await tx.capture_sessions.findUnique({
        where: { id: input.sessionId },
        include: WITH_ATTEMPTS,
      });
      if (row === null) {
        throw captureErrors.notFound(CaptureReason.SESSION_NOT_FOUND);
      }
      const session = toSession(row);
      if (session.status === 'CANCELLED') {
        return { session, closed: false, rejected: [] };
      }
      if (!OPEN.includes(session.status)) {
        throw captureErrors.precondition(CaptureReason.SESSION_NOT_OPEN);
      }

      const rejected = session.attempts.filter(
        (attempt) => attempt.result === 'PENDING_REVIEW',
      );
      for (const attempt of rejected) {
        const raw = row.capture_attempts.find(
          (candidate) => candidate.id === attempt.id,
        );
        await tx.capture_attempts.update({
          where: { id: attempt.id },
          data: {
            result: 'REJECTED',
            failure_reason: 'NOT_SELECTED',
            metadata_json: rejectedMetadata(
              raw?.metadata_json,
              input.staffUserId,
              input.now,
            ),
          },
        });
      }
      await tx.capture_sessions.update({
        where: { id: session.id },
        data: {
          status: 'CANCELLED',
          ended_at: input.now,
          accepted_source_id: null,
        },
      });

      const reloaded = await tx.capture_sessions.findUniqueOrThrow({
        where: { id: session.id },
        include: WITH_ATTEMPTS,
      });
      return { session: toSession(reloaded), closed: true, rejected };
    });
  }
}

/** Staff rejection: drops the image reference, records who and when. */
function rejectedMetadata(
  raw: unknown,
  staffUserId: string,
  now: Date,
): Record<string, string> {
  const {
    imageKey: _imageKey,
    imageSha256: _imageSha256,
    imageBytes: _imageBytes,
    ...kept
  } = metadataRecord(raw);
  return {
    ...(kept as Record<string, string>),
    rejectedByUserId: staffUserId,
    rejectedAt: now.toISOString(),
  };
}

/** Serializes concurrent writers on one key until the transaction ends. */
async function lock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

type SessionFilter = NonNullable<
  Parameters<Tx['capture_sessions']['findMany']>[0]
>['where'];

/**
 * Lazy expiry: open sessions created before the window become EXPIRED, and their
 * PENDING_REVIEW attempts become REJECTED / EXPIRED in the same transaction. Returns
 * the image keys the caller deletes after commit. Each session is handled under its
 * `capture-session:{id}` lock (ids sorted, so two callers cannot deadlock).
 */
async function expireStale(
  tx: Tx,
  filter: SessionFilter,
  window: ExpiryWindow,
): Promise<string[]> {
  const stale = await tx.capture_sessions.findMany({
    where: {
      AND: [
        filter ?? {},
        {
          status: { in: OPEN },
          created_at: { lt: window.expireCreatedBefore },
        },
      ],
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const keys: string[] = [];
  for (const { id } of stale) {
    await lock(tx, `capture-session:${id}`);
    const row = await tx.capture_sessions.findFirst({
      where: { id, status: { in: OPEN } },
      include: WITH_ATTEMPTS,
    });
    if (row === null) {
      continue;
    }
    for (const attempt of row.capture_attempts) {
      if (attempt.result !== 'PENDING_REVIEW') {
        continue;
      }
      const meta = metadataRecord(attempt.metadata_json);
      if (typeof meta.imageKey === 'string') {
        keys.push(meta.imageKey);
      }
      await tx.capture_attempts.update({
        where: { id: attempt.id },
        data: {
          result: 'REJECTED',
          failure_reason: 'EXPIRED',
          metadata_json: {
            ...withoutImage(meta),
            rejectedAt: window.now.toISOString(),
          },
        },
      });
    }
    await tx.capture_sessions.update({
      where: { id },
      data: expiredData(window.now),
    });
  }
  return keys;
}

function withoutImage(meta: Record<string, unknown>): Record<string, unknown> {
  const {
    imageKey: _imageKey,
    imageSha256: _imageSha256,
    imageBytes: _imageBytes,
    ...kept
  } = meta;
  return kept;
}

function expiredData(now: Date) {
  return {
    status: 'EXPIRED',
    ended_at: now,
    failure_reason: 'SESSION_EXPIRED',
  } as const;
}

function toSession(row: SessionRow): CaptureSessionRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    consentId: row.consent_id,
    deviceCode: row.device_code ?? '',
    status: row.status,
    sourcePlanMode: row.source_plan_mode,
    staffUserId: row.staff_user_id,
    acceptedSourceId: row.accepted_source_id,
    createdAt: row.created_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    attempts: row.capture_attempts.map(toAttempt),
  };
}

function toAttempt(row: AttemptRow): CaptureAttemptRecord {
  const meta = readMetadata(row.metadata_json);
  return {
    id: row.id,
    attemptNo: row.attempt_no,
    result: row.result,
    failureReason: row.failure_reason,
    qualityScore: row.quality_score === null ? null : Number(row.quality_score),
    qualityThresholdSnapshot:
      row.quality_threshold_snapshot === null
        ? null
        : Number(row.quality_threshold_snapshot),
    attemptedAt: row.attempted_at,
    nonce: meta.nonce,
    imageKey: meta.imageKey,
    imageSha256: meta.imageSha256,
  };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readMetadata(value: unknown): {
  nonce: string | undefined;
  imageKey: string | undefined;
  imageSha256: string | undefined;
} {
  const record = metadataRecord(value);
  const text = (key: string): string | undefined =>
    typeof record[key] === 'string' ? record[key] : undefined;
  return {
    nonce: text('nonce'),
    imageKey: text('imageKey'),
    imageSha256: text('imageSha256'),
  };
}
