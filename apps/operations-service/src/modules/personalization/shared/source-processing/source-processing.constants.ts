import { memoraQueueName } from '@app/queue';

/** BullMQ queue owned by Operations personalization (PERSO-013, D-P-09). */
export const SOURCE_PROCESSING_QUEUE = memoraQueueName(
  'personalization',
  'source-processing',
);
export const SOURCE_PROCESSING_JOB_NAME = 'process';
export const SOURCE_PROCESSING_BACKOFF_TYPE = 'source-processing';

/** One run plus three retries (docs/api/personalization/processing-worker.md section 3). */
export const SOURCE_PROCESSING_ATTEMPTS = 4;
/** Delay before retry 1, 2 and 3: 30 s, 2 min, 8 min. */
export const SOURCE_PROCESSING_RETRY_DELAYS_MS = [30_000, 120_000, 480_000];

/** Python calls block, so only a few run at once. */
export const SOURCE_PROCESSING_CONCURRENCY = 2;

export const FINGERPRINT_TIMEOUT_MS = 60_000;
export const SOUNDWAVE_TIMEOUT_MS = 90_000;
export const RENDER_TIMEOUT_MS = 30_000;

/** Output prefix every worker request uses (contract section 4). */
export function sourceOutputPrefix(sourceId: string): string {
  return `personalization/sources/${sourceId}/`;
}

export const SOUNDWAVE_SEGMENT_DURATION_MS = 3000;

export const FailureCode = {
  WORKER_UNAVAILABLE: 'WORKER_UNAVAILABLE',
  WORKER_UNAUTHORIZED: 'WORKER_UNAUTHORIZED',
  WAVECODE_EXHAUSTED: 'WAVECODE_EXHAUSTED',
  SOURCE_INVALID: 'SOURCE_INVALID',
} as const;
