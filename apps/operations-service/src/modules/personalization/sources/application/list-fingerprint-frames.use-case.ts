import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ListFingerprintFramesResponse } from '@app/contracts';
import {
  PROCESSING_WORKER_PORT,
  type ProcessingWorkerPort,
} from '../../shared/source-processing/application/processing-worker.port';
import { sourceErrors } from './sources.errors';

/** How long the worker's frame list is reused before it is fetched again. */
export const FINGERPRINT_FRAMES_CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  readonly value: ListFingerprintFramesResponse;
  readonly expiresAt: number;
}

/**
 * PERSO-036. Public read: the frame list comes from the processing worker and is cached in
 * memory for 10 minutes. Concurrent misses share one worker call. When the worker fails an
 * expired entry is still served; with no entry at all the answer is 503
 * PROCESSING_WORKER_UNAVAILABLE.
 */
@Injectable()
export class ListFingerprintFramesUseCase {
  private readonly logger = new Logger(ListFingerprintFramesUseCase.name);
  private cache: CacheEntry | undefined;
  private inflight: Promise<ListFingerprintFramesResponse> | undefined;

  constructor(
    @Inject(PROCESSING_WORKER_PORT)
    private readonly worker: ProcessingWorkerPort,
  ) {}

  async execute(): Promise<ListFingerprintFramesResponse> {
    const cached = this.cache;
    if (cached !== undefined && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    this.inflight ??= this.refresh().finally(() => {
      this.inflight = undefined;
    });
    try {
      return await this.inflight;
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      if (cached !== undefined) {
        this.logger.warn(
          `Frame refresh failed, serving the cached list: ${reason}`,
        );
        return cached.value;
      }
      this.logger.error(`Fingerprint frames unavailable: ${reason}`);
      throw sourceErrors.workerUnavailable();
    }
  }

  private async refresh(): Promise<ListFingerprintFramesResponse> {
    const catalog = await this.worker.listFingerprintFrames();
    const value: ListFingerprintFramesResponse = {
      defaultShape: catalog.defaultShape,
      shapes: catalog.shapes.map((shape) => ({ ...shape })),
    };
    this.cache = {
      value,
      expiresAt: Date.now() + FINGERPRINT_FRAMES_CACHE_TTL_MS,
    };
    return value;
  }
}
