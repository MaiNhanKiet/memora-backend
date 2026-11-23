import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import type {
  FingerprintArtwork,
  FingerprintArtworkVersion,
} from '@app/contracts';
import {
  isEditable,
  type ArtworkState,
  type ArtworkVersion,
} from '../../shared/source-processing/application/artwork-state';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import {
  PROCESSING_WORKER_PORT,
  ProcessingWorkerError,
  type ProcessingWorkerPort,
} from '../../shared/source-processing/application/processing-worker.port';
import { sourceErrors, SourceReason } from './sources.errors';
import type { ArtworkSourceRecord } from './artwork.repository';

/** Lifetime of the preview URLs (PERSO-037..039). They are credentials: never log them. */
export const ARTWORK_PREVIEW_TTL_SECONDS = 300;

/** Worker 422 codes that reach the client unchanged (answered 422). */
const PASS_THROUGH_CODES: readonly string[] = [
  SourceReason.ERASE_AREA_TOO_LARGE,
  SourceReason.FRAME_COVERAGE_TOO_LOW,
];

/** Shared steps of PERSO-037..039. */
@Injectable()
export class ArtworkSupport {
  private readonly logger = new Logger(ArtworkSupport.name);

  constructor(
    @Inject(PROCESSING_WORKER_PORT)
    readonly worker: ProcessingWorkerPort,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
  ) {}

  /** A READY FINGERPRINT source, else 409 SOURCE_NOT_READY. The artwork may still be missing. */
  requireReady(record: ArtworkSourceRecord): ArtworkState | undefined {
    if (record.sourceType !== 'FINGERPRINT' || record.status !== 'READY') {
      throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
    }
    return record.artwork;
  }

  /** Not accepted yet (ARTWORK_LOCKED) and made by a worker that keeps the base image. */
  requireEditable(record: ArtworkSourceRecord): ArtworkState {
    const state = this.requireReady(record);
    if (state?.acceptedVersionId !== undefined) {
      throw sourceErrors.conflict(SourceReason.ARTWORK_LOCKED);
    }
    if (state === undefined || !isEditable(state)) {
      throw sourceErrors.conflict(SourceReason.ARTWORK_NOT_EDITABLE);
    }
    return state;
  }

  /** Maps a worker failure; HttpExceptions pass through. Never leaks worker details. */
  workerFailure(error: unknown, what: string, sourceId: string): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof ProcessingWorkerError && error.kind === 'DATA') {
      const code = error.failureCode;
      if (code !== undefined && PASS_THROUGH_CODES.includes(code)) {
        return sourceErrors.invalid(code);
      }
      if (code === 'OBJECT_NOT_FOUND') {
        return sourceErrors.conflict(SourceReason.ARTWORK_NOT_EDITABLE);
      }
    }
    this.logger.warn(
      `${what} of source ${sourceId} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return sourceErrors.workerUnavailable();
  }

  /**
   * Public body of PERSO-037..039. No keys, checksums or erase strokes; every URL is a 300 s
   * presigned GET and only exists when the object key is known. After acceptance only the
   * accepted version is listed and the base image is gone, even while cleanup is pending.
   */
  async toResponse(record: ArtworkSourceRecord): Promise<FingerprintArtwork> {
    if (record.sourceType !== 'FINGERPRINT') {
      throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
    }
    const state = record.status === 'READY' ? record.artwork : undefined;
    const accepted = state?.acceptedVersionId;
    const ids = Object.keys(state?.versions ?? {})
      .filter((id) => accepted === undefined || id === accepted)
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    const [baseImageUrl, versions] = await Promise.all([
      state?.baseKey !== undefined && accepted === undefined
        ? this.presign(state.baseKey, 'image/png')
        : undefined,
      Promise.all(ids.map((id) => this.versionState(id, state?.versions[id]))),
    ]);
    return {
      status: record.status,
      ...(record.failureCode === undefined
        ? {}
        : { failureCode: record.failureCode }),
      ...(baseImageUrl === undefined ? {} : { baseImageUrl }),
      ...(state?.currentVersionId === undefined
        ? {}
        : { currentVersionId: state.currentVersionId }),
      ...(accepted === undefined ? {} : { acceptedVersionId: accepted }),
      versions: versions.filter(
        (item): item is FingerprintArtworkVersion => item !== undefined,
      ),
    };
  }

  private async versionState(
    versionId: string,
    version: ArtworkVersion | undefined,
  ): Promise<FingerprintArtworkVersion | undefined> {
    if (version === undefined) {
      return undefined;
    }
    const [previewSvgUrl, previewPngUrl] = await Promise.all([
      this.presign(version.svgKey, 'image/svg+xml'),
      this.presign(version.pngKey, 'image/png'),
    ]);
    return {
      versionId,
      shape: version.shape,
      offsetX: version.offsetX,
      offsetY: version.offsetY,
      zoom: version.zoom,
      erasedRatio: version.erasedRatio,
      minEngraveSizeMm: version.minEngraveSizeMm,
      coverage: version.coverage,
      createdAt: version.createdAt,
      previewSvgUrl,
      previewPngUrl,
    };
  }

  /** The URL is a credential: it is returned, never logged. */
  private async presign(key: string, contentType: string): Promise<string> {
    try {
      const signed = await this.storage.presignGet(key, {
        expiresInSeconds: ARTWORK_PREVIEW_TTL_SECONDS,
        contentType,
      });
      return signed.url;
    } catch (error: unknown) {
      this.logger.error(
        `Presigning an artwork object failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw sourceErrors.storageUnavailable();
    }
  }
}
