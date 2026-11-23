import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ListSoundwaveStylesResponse } from '@app/contracts';
import {
  PROCESSING_WORKER_PORT,
  type ProcessingWorkerPort,
} from '../../shared/source-processing/application/processing-worker.port';
import { SOUNDWAVE_STYLES_CACHE_TTL_MS } from './soundwave-upload.config';
import { soundwaveUploadErrors } from './soundwave-upload.errors';

interface CacheEntry {
  readonly value: ListSoundwaveStylesResponse;
  readonly expiresAt: number;
}

/**
 * PERSO-031. Public read: the style list comes from the processing worker and is cached in
 * memory for 10 minutes. Concurrent misses share one worker call. When the worker fails, an
 * expired entry is still served; with no entry at all the answer is 503
 * PROCESSING_WORKER_UNAVAILABLE.
 */
@Injectable()
export class ListSoundwaveStylesUseCase {
  private readonly logger = new Logger(ListSoundwaveStylesUseCase.name);
  private cache: CacheEntry | undefined;
  private inflight: Promise<ListSoundwaveStylesResponse> | undefined;

  constructor(
    @Inject(PROCESSING_WORKER_PORT)
    private readonly worker: ProcessingWorkerPort,
  ) {}

  async execute(): Promise<ListSoundwaveStylesResponse> {
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
          `Style refresh failed, serving the cached list: ${reason}`,
        );
        return cached.value;
      }
      this.logger.error(`Soundwave styles unavailable: ${reason}`);
      throw soundwaveUploadErrors.workerUnavailable();
    }
  }

  private async refresh(): Promise<ListSoundwaveStylesResponse> {
    const catalog = await this.worker.listSoundwaveStyles();
    const value: ListSoundwaveStylesResponse = {
      defaultStyle: catalog.defaultStyle,
      styles: catalog.styles.map((style) => ({ ...style })),
    };
    this.cache = {
      value,
      expiresAt: Date.now() + SOUNDWAVE_STYLES_CACHE_TTL_MS,
    };
    return value;
  }
}
