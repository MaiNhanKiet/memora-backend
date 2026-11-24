import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import {
  ARTWORK_MAX_VERSIONS,
  type AcceptFingerprintArtworkRequest,
  type CreateFingerprintCropRequest,
  type FingerprintArtwork,
  type GetFingerprintArtworkRequest,
} from '@app/contracts';
import type { ArtworkState } from '../../shared/source-processing/application/artwork-state';
import type { FingerprintCropRendered } from '../../shared/source-processing/application/processing-worker.port';
import { sourceOutputPrefix } from '../../shared/source-processing/source-processing.constants';
import { ArtworkSupport } from './artwork-support';
import { requireVersionId, validateCrop } from './artwork-validation';
import {
  ARTWORK_REPOSITORY,
  type ArtworkRepository,
  type ArtworkSourceRecord,
} from './artwork.repository';
import { sourceErrors, SourceReason } from './sources.errors';
import { requireSourceId } from './wavecode-support';

/** PERSO-037. Read only, no worker call. */
@Injectable()
export class GetFingerprintArtworkUseCase {
  constructor(
    @Inject(ARTWORK_REPOSITORY) private readonly sources: ArtworkRepository,
    private readonly support: ArtworkSupport,
  ) {}

  async execute(
    request: GetFingerprintArtworkRequest,
  ): Promise<FingerprintArtwork> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const record = await this.sources.find(sourceId, actor.customerIdentityId);
    if (record === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }
    return this.support.toResponse(record);
  }
}

/**
 * PERSO-038. Under the artwork lock: ask the worker to render the crop from the stored base
 * image, record the new version (with its erase strokes, for audit) and make it current.
 * Earlier versions are never touched.
 */
@Injectable()
export class CreateFingerprintCropUseCase {
  constructor(
    @Inject(ARTWORK_REPOSITORY) private readonly sources: ArtworkRepository,
    private readonly support: ArtworkSupport,
  ) {}

  async execute(
    request: CreateFingerprintCropRequest,
  ): Promise<FingerprintArtwork> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const crop = validateCrop(request);

    const updated = await this.sources.updateLocked(
      sourceId,
      actor.customerIdentityId,
      async (record) => {
        const state = this.support.requireEditable(record);
        const ids = Object.keys(state.versions);
        if (ids.length >= ARTWORK_MAX_VERSIONS) {
          throw sourceErrors.conflict(
            SourceReason.ARTWORK_VERSION_LIMIT_REACHED,
          );
        }
        if (record.orderId === undefined) {
          throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
        }
        const versionId = `v${Math.max(0, ...ids.map((id) => Number(id.slice(1)))) + 1}`;
        let rendered: FingerprintCropRendered;
        try {
          rendered = await this.support.worker.renderFingerprintCrop({
            sourceId: record.sourceId,
            outputPrefix: sourceOutputPrefix(
              'FINGERPRINT',
              record.orderId,
              record.sourceId,
            ),
            versionId,
            shape: crop.shape,
            offsetX: crop.offsetX,
            offsetY: crop.offsetY,
            zoom: crop.zoom,
            ...(crop.eraseStrokes.length === 0
              ? {}
              : { eraseStrokes: crop.eraseStrokes }),
            context: contextOf(record),
          });
        } catch (error: unknown) {
          throw this.support.workerFailure(
            error,
            'Rendering a crop',
            record.sourceId,
          );
        }
        const png = rendered.outputs.alphaPng;
        if (png === undefined) {
          throw this.support.workerFailure(
            new Error('Worker answered without the PNG'),
            'Rendering a crop',
            record.sourceId,
          );
        }
        const info = rendered.version;
        const next: ArtworkState = {
          ...state,
          aspectRatio: rendered.artwork.aspectRatio,
          hull: rendered.artwork.hull,
          currentVersionId: versionId,
          versions: {
            ...state.versions,
            [versionId]: {
              shape: info.shape,
              offsetX: info.offsetX,
              offsetY: info.offsetY,
              zoom: info.zoom,
              erasedRatio: info.erasedRatio,
              ridgeWidthRatio: info.ridgeWidthRatio,
              minEngraveSizeMm: info.minEngraveSizeMm,
              coverage: info.coverage,
              aspectRatio: rendered.artwork.aspectRatio,
              svgKey: rendered.outputs.vectorSvg.key,
              svgSha256: rendered.outputs.vectorSvg.sha256,
              pngKey: png.key,
              pngSha256: png.sha256,
              hull: rendered.artwork.hull.map((point) => [...point]),
              createdAt: new Date().toISOString(),
              ...(crop.eraseStrokes.length === 0
                ? {}
                : { eraseStrokes: crop.eraseStrokes }),
            },
          },
        };
        return next;
      },
    );
    if (updated === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }
    return this.support.toResponse(updated);
  }
}

/**
 * PERSO-039. Records the accepted version in the database (lock, current = accepted, vector
 * keys), then (after commit) asks the worker to delete the other versions and the base image.
 * A worker failure after the commit is only logged; accepting the same version again retries
 * the cleanup while other versions or the base key are still recorded. This does not replace
 * customer approval (PERSO-018).
 */
@Injectable()
export class AcceptFingerprintArtworkUseCase {
  private readonly logger = new Logger(AcceptFingerprintArtworkUseCase.name);

  constructor(
    @Inject(ARTWORK_REPOSITORY) private readonly sources: ArtworkRepository,
    private readonly support: ArtworkSupport,
  ) {}

  async execute(
    request: AcceptFingerprintArtworkRequest,
  ): Promise<FingerprintArtwork> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const versionId = requireVersionId(request.versionId);

    const committed = await this.sources.updateLocked(
      sourceId,
      actor.customerIdentityId,
      (record) => {
        const state = this.support.requireReady(record);
        if (state === undefined || Object.keys(state.versions).length === 0) {
          return Promise.reject(
            sourceErrors.conflict(SourceReason.ARTWORK_NOT_EDITABLE),
          );
        }
        if (
          state.acceptedVersionId !== undefined &&
          state.acceptedVersionId !== versionId
        ) {
          return Promise.reject(
            sourceErrors.conflict(SourceReason.ARTWORK_LOCKED),
          );
        }
        if (state.versions[versionId] === undefined) {
          return Promise.reject(
            sourceErrors.notFound(SourceReason.VERSION_NOT_FOUND),
          );
        }
        if (state.acceptedVersionId === versionId) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve({
          ...state,
          currentVersionId: versionId,
          acceptedVersionId: versionId,
          acceptedAt: new Date().toISOString(),
        });
      },
    );
    if (committed === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }

    const state = committed.artwork;
    if (
      state !== undefined &&
      (Object.keys(state.versions).length > 1 || state.baseKey !== undefined)
    ) {
      const done = await this.cleanUp(
        committed,
        actor.customerIdentityId,
        versionId,
      );
      return this.support.toResponse(done ?? committed);
    }
    return this.support.toResponse(committed);
  }

  /** Never throws: the acceptance is already committed. */
  private async cleanUp(
    record: ArtworkSourceRecord,
    owner: string,
    versionId: string,
  ): Promise<ArtworkSourceRecord | undefined> {
    if (record.orderId === undefined) {
      return undefined;
    }
    try {
      await this.support.worker.selectFingerprintVersion({
        sourceId: record.sourceId,
        outputPrefix: sourceOutputPrefix(
          'FINGERPRINT',
          record.orderId,
          record.sourceId,
        ),
        versionId,
        context: contextOf(record),
      });
      return await this.sources.updateLocked(
        record.sourceId,
        owner,
        (fresh) => {
          const current = fresh.artwork;
          const keep = current?.versions[versionId];
          if (
            current === undefined ||
            current.acceptedVersionId !== versionId ||
            keep === undefined
          ) {
            return Promise.resolve(undefined);
          }
          const { baseKey: _baseKey, ...rest } = current;
          void _baseKey;
          return Promise.resolve({ ...rest, versions: { [versionId]: keep } });
        },
      );
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Deleting the other artwork versions of source ${record.sourceId} failed; accept again to retry: ${reason}`,
      );
      return undefined;
    }
  }
}

function contextOf(record: ArtworkSourceRecord) {
  return {
    orderId: record.orderId ?? '',
    ...(record.sessionId === undefined ? {} : { sessionId: record.sessionId }),
    ...(record.attemptNo === undefined ? {} : { attemptNo: record.attemptNo }),
    ringItemIds: record.ringItemIds,
  };
}
