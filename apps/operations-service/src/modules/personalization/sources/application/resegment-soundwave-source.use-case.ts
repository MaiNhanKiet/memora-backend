import { Inject, Injectable, Logger } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import {
  SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  SOUNDWAVE_SEGMENT_MS,
  type ResegmentSoundwaveSourceRequest,
  type SoundwaveWavecode,
} from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import {
  SOURCE_PROCESSING_TRIGGER,
  type SourceProcessingTrigger,
} from '../../shared/source-processing/source-processing.port';
import { sourceOutputPrefix } from '../../shared/source-processing/source-processing.constants';
import { sourceErrors, SourceReason } from './sources.errors';
import {
  requireSourceId,
  requireStyle,
  WavecodeSupport,
} from './wavecode-support';
import {
  WAVECODE_REPOSITORY,
  type ResegmentPlan,
  type WavecodeRepository,
  type WavecodeSourceRecord,
} from './wavecode.repository';

/** At most this many re-segmentations per source. */
export const RESEGMENT_LIMIT = 10;

/**
 * PERSO-035. Lets the customer pick another 3 s segment of the uploaded audio. Under the
 * wavecode lock the source goes back to ACCEPTED with its results cleared; after commit the
 * old outputs are deleted (best effort) and processing is queued again with the new revision.
 */
@Injectable()
export class ResegmentSoundwaveSourceUseCase {
  private readonly logger = new Logger(ResegmentSoundwaveSourceUseCase.name);

  constructor(
    @Inject(WAVECODE_REPOSITORY) private readonly sources: WavecodeRepository,
    private readonly support: WavecodeSupport,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(SOURCE_PROCESSING_TRIGGER)
    private readonly processing: SourceProcessingTrigger,
  ) {}

  async execute(
    request: ResegmentSoundwaveSourceRequest,
  ): Promise<SoundwaveWavecode> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const sourceId = requireSourceId(request.sourceId);
    const segmentStartMs = request.segmentStartMs;
    if (
      typeof segmentStartMs !== 'number' ||
      !Number.isInteger(segmentStartMs) ||
      segmentStartMs < 0
    ) {
      throw sourceErrors.invalid(SourceReason.INVALID_SEGMENT_START);
    }
    const requestedStyle =
      request.wavecodeStyle === undefined ||
      request.wavecodeStyle === null ||
      request.wavecodeStyle === ''
        ? undefined
        : requireStyle(request.wavecodeStyle);

    const outcome = await this.sources.resegment(
      sourceId,
      actor.customerIdentityId,
      (record) => plan(record, segmentStartMs, requestedStyle),
    );
    if (outcome === undefined) {
      throw sourceErrors.notFound(SourceReason.SOURCE_NOT_FOUND);
    }

    await this.deleteOldOutputs(outcome.before);
    try {
      await this.processing.enqueue(sourceId, outcome.after.revision);
    } catch (error: unknown) {
      this.logger.warn(
        `Processing was not queued for source ${sourceId}: ${describe(error)}`,
      );
    }
    return this.support.toResponse(outcome.after);
  }

  /** Best effort: a missing or undeletable object is only a warning. */
  private async deleteOldOutputs(before: WavecodeSourceRecord): Promise<void> {
    const keys: string[] = [];
    for (const files of Object.values(before.wavecode?.styles ?? {})) {
      keys.push(files.svgKey, files.pngKey);
    }
    if (before.audioSegmentKey !== undefined) {
      keys.push(before.audioSegmentKey);
    }
    if (before.orderId !== undefined) {
      keys.push(
        `${sourceOutputPrefix('SOUNDWAVE', before.orderId, before.sourceId)}manifest.json`,
      );
    }
    for (const key of keys) {
      try {
        await this.storage.deleteObject(key);
      } catch (error: unknown) {
        this.logger.warn(
          `Old output of source ${before.sourceId} was not deleted: ${describe(error)}`,
        );
      }
    }
  }
}

function plan(
  record: WavecodeSourceRecord,
  segmentStartMs: number,
  requestedStyle: string | undefined,
): ResegmentPlan {
  if (record.sourceType !== 'SOUNDWAVE') {
    throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
  }
  if (record.status === 'ACCEPTED' || record.status === 'PROCESSING') {
    throw sourceErrors.conflict(SourceReason.SOURCE_BUSY);
  }
  if (record.status !== 'READY' && record.status !== 'PROCESSING_FAILED') {
    throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
  }
  if (record.wavecode?.acceptedStyle !== undefined) {
    throw sourceErrors.conflict(SourceReason.WAVECODE_STYLE_LOCKED);
  }
  if (record.resegmentCount >= RESEGMENT_LIMIT) {
    throw sourceErrors.conflict(SourceReason.RESEGMENT_LIMIT_REACHED);
  }
  const durationMs = record.measuredDurationMs ?? record.declaredDurationMs;
  if (durationMs === undefined) {
    throw sourceErrors.conflict(SourceReason.SOURCE_NOT_READY);
  }
  if (segmentStartMs + SOUNDWAVE_SEGMENT_MS > durationMs) {
    throw sourceErrors.invalid(SourceReason.SEGMENT_OUT_OF_RANGE);
  }
  return {
    segmentStartMs,
    wavecodeStyle:
      requestedStyle ??
      record.wavecode?.style ??
      record.wavecodeStyle ??
      SOUNDWAVE_DEFAULT_WAVECODE_STYLE,
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
