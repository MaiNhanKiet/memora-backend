import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_SEGMENT_MS,
  SOUNDWAVE_WAVECODE_STYLES,
} from '@app/contracts';
import type { SoundwaveWavecode, WavecodeStyleState } from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import {
  PROCESSING_WORKER_PORT,
  type ProcessingWorkerPort,
} from '../../shared/source-processing/application/processing-worker.port';
import { sourceOutputPrefix } from '../../shared/source-processing/source-processing.constants';
import { sourceErrors, SourceReason } from './sources.errors';
import {
  knownStyle,
  WAVECODE_STYLE_NAMES,
  type WavecodeState,
  type WavecodeStyleEntry,
} from '../../shared/source-processing/application/wavecode-state';
import type { WavecodeSourceRecord } from './wavecode.repository';

/** Lifetime of the preview URLs (PERSO-032..034). They are credentials: never log them. */
export const WAVECODE_PREVIEW_TTL_SECONDS = 300;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireSourceId(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw sourceErrors.invalid(SourceReason.INVALID_SOURCE_ID);
  }
  return value.toLowerCase();
}

/** Static list only; the worker is never asked to validate. */
export function requireStyle(value: unknown): string {
  const style = knownStyle(value);
  if (style === undefined) {
    throw sourceErrors.invalid(SourceReason.INVALID_WAVECODE_STYLE);
  }
  return style;
}

/** Shared steps of PERSO-032..034. */
@Injectable()
export class WavecodeSupport {
  private readonly logger = new Logger(WavecodeSupport.name);

  constructor(
    @Inject(PROCESSING_WORKER_PORT)
    readonly worker: ProcessingWorkerPort,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
  ) {}

  /** The source must be a READY SOUNDWAVE with a wavecode, else 409 SOURCE_NOT_READY. */
  requireReady(record: WavecodeSourceRecord): WavecodeState {
    if (
      record.sourceType !== 'SOUNDWAVE' ||
      record.status !== 'READY' ||
      record.wavecode === undefined
    ) {
      throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
    }
    return record.wavecode;
  }

  /**
   * Makes sure `style` has files. A style that already exists is reused without a worker
   * call; otherwise render-wavecode adds it (the worker keeps the other styles).
   */
  async ensureGenerated(
    record: WavecodeSourceRecord,
    state: WavecodeState,
    style: string,
  ): Promise<WavecodeState> {
    if (state.styles[style] !== undefined) {
      return state;
    }
    if (record.orderId === undefined) {
      throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
    }
    let generated: Readonly<Record<string, WavecodeStyleEntry>> | undefined;
    try {
      const rendered = await this.worker.renderWavecode({
        sourceId: record.sourceId,
        outputPrefix: sourceOutputPrefix(
          'SOUNDWAVE',
          record.orderId,
          record.sourceId,
        ),
        levels: state.levels,
        style,
        context: {
          orderId: record.orderId,
          ringItemIds: record.ringItemIds,
        },
      });
      generated = fromWorkerStyles(rendered.wavecode.styles);
    } catch (error: unknown) {
      this.logger.warn(
        `Rendering style ${style} of source ${record.sourceId} failed: ${describe(error)}`,
      );
      throw sourceErrors.workerUnavailable();
    }
    if (generated[style] === undefined) {
      this.logger.warn(
        `Worker answered without the ${style} files for source ${record.sourceId}`,
      );
      throw sourceErrors.workerUnavailable();
    }
    return { ...state, styles: { ...state.styles, ...generated } };
  }

  /**
   * Public body of PERSO-032..035. No keys or checksums; every URL is a 300 s presigned GET
   * and only exists when the object key is known. Styles are `generated` only while READY.
   */
  async toResponse(record: WavecodeSourceRecord): Promise<SoundwaveWavecode> {
    if (record.sourceType !== 'SOUNDWAVE') {
      throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
    }
    const state = record.status === 'READY' ? record.wavecode : undefined;
    const [styles, rawAudioUrl, segmentAudioUrl] = await Promise.all([
      Promise.all(
        SOUNDWAVE_WAVECODE_STYLES.map((code) => this.styleState(state, code)),
      ),
      record.status !== 'PENDING' && record.rawAssetKey !== undefined
        ? this.presign(
            record.rawAssetKey,
            record.contentType ?? 'application/octet-stream',
          )
        : undefined,
      state !== undefined && record.audioSegmentKey !== undefined
        ? this.presign(record.audioSegmentKey, 'audio/wav')
        : undefined,
    ]);
    const durationMs = record.measuredDurationMs ?? record.declaredDurationMs;
    const acceptedStyle = record.wavecode?.acceptedStyle;
    return {
      status: record.status,
      ...(record.failureCode === undefined
        ? {}
        : { failureCode: record.failureCode }),
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(record.segmentStartMs === undefined
        ? {}
        : { segmentStartMs: record.segmentStartMs }),
      segmentDurationMs: SOUNDWAVE_SEGMENT_MS,
      ...(rawAudioUrl === undefined ? {} : { rawAudioUrl }),
      ...(segmentAudioUrl === undefined ? {} : { segmentAudioUrl }),
      currentStyle:
        record.wavecode?.style ??
        record.wavecodeStyle ??
        SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
      ...(acceptedStyle === undefined ? {} : { acceptedStyle }),
      styles,
    };
  }

  private async styleState(
    state: WavecodeState | undefined,
    code: string,
  ): Promise<WavecodeStyleState> {
    const name = WAVECODE_STYLE_NAMES[code] ?? code;
    // After acceptance only the accepted style is kept, even while cleanup is pending.
    const files =
      state === undefined ||
      (state.acceptedStyle !== undefined && state.acceptedStyle !== code)
        ? undefined
        : state.styles[code];
    if (files === undefined) {
      return { code, name, generated: false };
    }
    const [previewSvgUrl, previewPngUrl] = await Promise.all([
      this.presign(files.svgKey, 'image/svg+xml'),
      this.presign(files.pngKey, 'image/png'),
    ]);
    return { code, name, generated: true, previewSvgUrl, previewPngUrl };
  }

  /** The URL is a credential: it is returned, never logged. */
  private async presign(key: string, contentType: string): Promise<string> {
    try {
      const signed = await this.storage.presignGet(key, {
        expiresInSeconds: WAVECODE_PREVIEW_TTL_SECONDS,
        contentType,
      });
      return signed.url;
    } catch (error: unknown) {
      this.logger.error(
        `Presigning a source object failed: ${describe(error)}`,
      );
      throw sourceErrors.storageUnavailable();
    }
  }
}

function fromWorkerStyles(
  styles:
    | Readonly<
        Record<
          string,
          {
            vectorSvg: { key: string; sha256: string; sizeBytes: number };
            alphaPng: { key: string; sha256: string; sizeBytes: number };
          }
        >
      >
    | undefined,
): Record<string, WavecodeStyleEntry> {
  const result: Record<string, WavecodeStyleEntry> = {};
  for (const [code, files] of Object.entries(styles ?? {})) {
    if (knownStyle(code) === undefined) {
      continue;
    }
    result[code] = {
      svgKey: files.vectorSvg.key,
      svgSha256: files.vectorSvg.sha256,
      svgSize: files.vectorSvg.sizeBytes,
      pngKey: files.alphaPng.key,
      pngSha256: files.alphaPng.sha256,
      pngSize: files.alphaPng.sizeBytes,
    };
  }
  return result;
}

export { fromWorkerStyles };

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
