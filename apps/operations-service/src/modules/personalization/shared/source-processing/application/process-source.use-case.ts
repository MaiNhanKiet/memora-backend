import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_WAVECODE_STYLES,
} from '@app/contracts';
import {
  FailureCode,
  SOUNDWAVE_SEGMENT_DURATION_MS,
  sourceOutputPrefix,
} from '../source-processing.constants';
import {
  PROCESSING_WORKER_PORT,
  ProcessingWorkerError,
  type ProcessingWorkerPort,
  type FingerprintProcessed,
  type WavecodeRendered,
  type WavecodeResult,
  type WorkerContext,
  type WorkerOutputs,
} from './processing-worker.port';
import { readArtworkState, writeArtworkState } from './artwork-state';
import { readWavecodeState } from './wavecode-state';
import {
  SOURCE_PROCESSING_REPOSITORY,
  type JsonValue,
  type ProcessableSource,
  type SourceProcessingRepository,
} from './source-processing.repository';

export type ProcessSourceOutcome =
  | { readonly kind: 'IGNORED' }
  | { readonly kind: 'READY' }
  | { readonly kind: 'FAILED'; readonly failureCode: string };

/** Thrown for a transient failure that still has retries left; the job runner retries. */
export class ProcessingRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcessingRetryError';
  }
}

/**
 * PERSO-013. ACCEPTED -> PROCESSING -> worker call -> READY | PROCESSING_FAILED.
 * Every write is conditional on the status, so a late result never overwrites a source
 * that left PROCESSING. The worker only sees object keys.
 */
@Injectable()
export class ProcessSourceUseCase {
  private readonly logger = new Logger(ProcessSourceUseCase.name);

  constructor(
    @Inject(SOURCE_PROCESSING_REPOSITORY)
    private readonly sources: SourceProcessingRepository,
    @Inject(PROCESSING_WORKER_PORT)
    private readonly worker: ProcessingWorkerPort,
  ) {}

  /** `isFinalAttempt`: a transient failure now ends in PROCESSING_FAILED instead of a retry. */
  async execute(
    sourceId: string,
    isFinalAttempt: boolean,
    revision?: number,
  ): Promise<ProcessSourceOutcome> {
    let source = await this.sources.find(sourceId);
    if (source === undefined || !isProcessable(source.status)) {
      return { kind: 'IGNORED' };
    }
    // PERSO-035: a job of an older revision is stale (the customer picked another segment).
    // Jobs queued before revisions existed carry none and are treated as current.
    if (
      revision !== undefined &&
      revision !== currentRevision(source.metadata)
    ) {
      return { kind: 'IGNORED' };
    }
    // PERSO-034 / PERSO-039: an accepted style or artwork is final; never reprocess such a source.
    if (
      readWavecodeState(source.metadata)?.acceptedStyle !== undefined ||
      readArtworkState(source.metadata)?.acceptedVersionId !== undefined
    ) {
      return { kind: 'IGNORED' };
    }
    if (source.status === 'ACCEPTED') {
      await this.sources.startProcessing(sourceId, new Date());
      source = await this.sources.find(sourceId);
      if (source === undefined || source.status !== 'PROCESSING') {
        return { kind: 'IGNORED' };
      }
    }

    try {
      return source.sourceType === 'SOUNDWAVE'
        ? await this.processSoundwave(source)
        : await this.processFingerprint(source);
    } catch (error: unknown) {
      return this.handleFailure(sourceId, error, isFinalAttempt);
    }
  }

  private async processFingerprint(
    source: ProcessableSource,
  ): Promise<ProcessSourceOutcome> {
    if (source.rawAssetKey === undefined) {
      throw new ProcessingWorkerError(
        'DATA',
        'Source has no raw asset',
        FailureCode.SOURCE_INVALID,
      );
    }
    const orderId = requireOrderId(source);
    const result = await this.worker.processFingerprint({
      sourceId: source.id,
      rawKey: source.rawAssetKey,
      outputPrefix: sourceOutputPrefix('FINGERPRINT', orderId, source.id),
      context: workerContext(source, orderId),
    });
    const saved = await this.sources.saveReady({
      sourceId: source.id,
      ...outputFields(result.outputs),
      metadata: {
        processorVersion: result.processorVersion,
        artwork: fingerprintArtwork(result),
        processedAt: new Date().toISOString(),
      },
    });
    return this.afterSave(source.id, saved);
  }

  private async processSoundwave(
    source: ProcessableSource,
  ): Promise<ProcessSourceOutcome> {
    const { contentType, durationMs, segmentStartMs } = source.metadata;
    if (
      source.rawAssetKey === undefined ||
      typeof contentType !== 'string' ||
      typeof durationMs !== 'number' ||
      typeof segmentStartMs !== 'number'
    ) {
      throw new ProcessingWorkerError(
        'DATA',
        'Source is missing soundwave upload details',
        FailureCode.SOURCE_INVALID,
      );
    }
    const orderId = requireOrderId(source);
    const outputPrefix = sourceOutputPrefix('SOUNDWAVE', orderId, source.id);
    const context = workerContext(source, orderId);
    const style = storedWavecodeStyle(source.metadata.wavecodeStyle);
    const first = await this.worker.processSoundwave({
      sourceId: source.id,
      rawKey: source.rawAssetKey,
      outputPrefix,
      contentType,
      declaredDurationMs: durationMs,
      segmentStartMs,
      segmentDurationMs: SOUNDWAVE_SEGMENT_DURATION_MS,
      style,
      context,
    });

    // Candidate 0 is the measured sequence (already rendered); the rest need render-wavecode.
    const candidates: (readonly number[])[] = [
      first.wavecode.levels,
      ...first.wavecode.nudgeCandidates,
    ];
    let from = 0;
    while (from < candidates.length) {
      const used = await this.sources.findUsedLevels(source.id, candidates);
      const index = firstUnused(candidates, used, from);
      if (index === undefined) {
        break;
      }
      let outputs: WorkerOutputs = first.outputs;
      let wavecode: WavecodeResult = first.wavecode;
      let processorVersion = first.processorVersion;
      if (index > 0) {
        const rendered: WavecodeRendered = await this.worker.renderWavecode({
          sourceId: source.id,
          outputPrefix,
          levels: candidates[index] ?? [],
          style,
          context,
        });
        outputs = rendered.outputs;
        wavecode = rendered.wavecode;
        processorVersion = rendered.processorVersion ?? processorVersion;
      }
      // The lock and the final uniqueness check happen inside the repository transaction.
      const outcome = await this.sources.saveSoundwaveReady({
        sourceId: source.id,
        levels: wavecode.levels,
        ...outputFields(outputs),
        metadata: {
          processorVersion,
          wavecode: {
            scheme: wavecode.scheme,
            style: wavecode.style ?? style,
            styles: styleEntries(wavecode),
            levels: [...wavecode.levels],
            checkBars: [...wavecode.checkBars],
          },
          measuredDurationMs: first.measuredDurationMs,
          ...(first.outputs.audioSegment === undefined
            ? {}
            : { audioSegmentKey: first.outputs.audioSegment.key }),
          processedAt: new Date().toISOString(),
        },
      });
      if (outcome === 'SAVED') {
        return { kind: 'READY' };
      }
      if (outcome === 'NOT_PROCESSING') {
        return this.afterSave(source.id, false);
      }
      from = index + 1;
    }
    return this.fail(source.id, FailureCode.WAVECODE_EXHAUSTED);
  }

  private afterSave(sourceId: string, saved: boolean): ProcessSourceOutcome {
    if (!saved) {
      this.logger.warn(
        `Late processing result for source ${sourceId} ignored: it is no longer PROCESSING`,
      );
      return { kind: 'IGNORED' };
    }
    return { kind: 'READY' };
  }

  private async handleFailure(
    sourceId: string,
    error: unknown,
    isFinalAttempt: boolean,
  ): Promise<ProcessSourceOutcome> {
    if (error instanceof ProcessingWorkerError && error.kind === 'DATA') {
      return this.fail(
        sourceId,
        error.failureCode ?? FailureCode.SOURCE_INVALID,
      );
    }
    if (
      error instanceof ProcessingWorkerError &&
      error.kind === 'UNAUTHORIZED'
    ) {
      this.logger.error(
        `Processing worker rejected the shared secret (source ${sourceId}); check OPERATIONS_PROCESSING_WORKER_SECRET`,
      );
      return this.fail(sourceId, FailureCode.WORKER_UNAUTHORIZED);
    }
    // Transient (or unexpected, for example a database blip): retry while attempts remain.
    const message = error instanceof Error ? error.message : 'unknown error';
    if (isFinalAttempt) {
      this.logger.error(
        `Processing source ${sourceId} failed after the last retry: ${message}`,
      );
      return this.fail(sourceId, FailureCode.WORKER_UNAVAILABLE);
    }
    this.logger.warn(
      `Processing source ${sourceId} failed, will retry: ${message}`,
    );
    throw new ProcessingRetryError(message);
  }

  private async fail(
    sourceId: string,
    failureCode: string,
  ): Promise<ProcessSourceOutcome> {
    const changed = await this.sources.markFailed(
      sourceId,
      failureCode,
      new Date(),
    );
    if (!changed) {
      return { kind: 'IGNORED' };
    }
    this.logger.warn(`Source ${sourceId} PROCESSING_FAILED (${failureCode})`);
    return { kind: 'FAILED', failureCode };
  }
}

function requireOrderId(source: ProcessableSource): string {
  if (source.orderId === undefined) {
    throw new ProcessingWorkerError(
      'DATA',
      'Source has no order',
      FailureCode.SOURCE_INVALID,
    );
  }
  return source.orderId;
}

export function workerContext(
  source: ProcessableSource,
  orderId: string,
): WorkerContext {
  return {
    orderId,
    ...(source.sourceType === 'FINGERPRINT' && source.sessionId !== undefined
      ? { sessionId: source.sessionId }
      : {}),
    ...(source.sourceType === 'FINGERPRINT' && source.attemptNo !== undefined
      ? { attemptNo: source.attemptNo }
      : {}),
    ringItemIds: source.ringItemIds,
  };
}

/** Style chosen at PERSO-010; anything unknown (older rows) falls back to the default. */
function storedWavecodeStyle(value: unknown): string {
  return (
    SOUNDWAVE_WAVECODE_STYLES.find((style) => style === value) ??
    SOUNDWAVE_DEFAULT_WAVECODE_STYLE
  );
}

/** Generated styles as stored in metadata_json.wavecode.styles (PERSO-032..034). */
function styleEntries(wavecode: WavecodeResult): Record<string, JsonValue> {
  const entries: Record<string, JsonValue> = {};
  for (const [code, files] of Object.entries(wavecode.styles ?? {})) {
    entries[code] = {
      svgKey: files.vectorSvg.key,
      svgSha256: files.vectorSvg.sha256,
      svgSize: files.vectorSvg.sizeBytes,
      pngKey: files.alphaPng.key,
      pngSha256: files.alphaPng.sha256,
      pngSize: files.alphaPng.sizeBytes,
    };
  }
  return entries;
}

/**
 * metadata.artwork of a processed fingerprint. With `base` and `version` from the worker the
 * design v0 is recorded and can be edited (PERSO-038); an older worker leaves only the
 * aspect ratio and hull, so editing is refused with ARTWORK_NOT_EDITABLE.
 */
function fingerprintArtwork(
  result: FingerprintProcessed,
): Record<string, JsonValue> {
  const hull = result.artwork.hull.map((point) => [...point]);
  const { base, version } = result;
  const png = result.outputs.alphaPng;
  if (base === undefined || version === undefined || png === undefined) {
    return { aspectRatio: result.artwork.aspectRatio, hull };
  }
  return writeArtworkState({
    aspectRatio: result.artwork.aspectRatio,
    hull,
    baseKey: base.key,
    currentVersionId: version.versionId,
    versions: {
      [version.versionId]: {
        shape: version.shape,
        offsetX: version.offsetX,
        offsetY: version.offsetY,
        zoom: version.zoom,
        erasedRatio: version.erasedRatio,
        ridgeWidthRatio: version.ridgeWidthRatio,
        minEngraveSizeMm: version.minEngraveSizeMm,
        coverage: version.coverage,
        aspectRatio: result.artwork.aspectRatio,
        svgKey: result.outputs.vectorSvg.key,
        svgSha256: result.outputs.vectorSvg.sha256,
        pngKey: png.key,
        pngSha256: png.sha256,
        hull,
        createdAt: new Date().toISOString(),
      },
    },
  });
}

function currentRevision(metadata: Readonly<Record<string, unknown>>): number {
  return typeof metadata.revision === 'number' ? metadata.revision : 0;
}

function isProcessable(status: string): boolean {
  return status === 'ACCEPTED' || status === 'PROCESSING';
}

function outputFields(outputs: WorkerOutputs): {
  manifestKey: string;
  vectorKey: string;
  vectorSha256: string;
} {
  return {
    manifestKey: outputs.manifest.key,
    vectorKey: outputs.vectorSvg.key,
    vectorSha256: outputs.vectorSvg.sha256,
  };
}

function firstUnused(
  candidates: readonly (readonly number[])[],
  used: readonly (readonly number[])[],
  from: number,
): number | undefined {
  for (let index = from; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    if (
      candidate !== undefined &&
      !used.some((other) => sameLevels(other, candidate))
    ) {
      return index;
    }
  }
  return undefined;
}

function sameLevels(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((level, i) => level === b[i]);
}
