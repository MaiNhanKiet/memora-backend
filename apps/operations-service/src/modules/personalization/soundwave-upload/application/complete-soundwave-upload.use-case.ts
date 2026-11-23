import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import {
  SOUNDWAVE_MAX_SIZE_BYTES,
  SOUNDWAVE_SEGMENT_MS,
  SOUNDWAVE_CONTENT_TYPES,
  type CompleteSoundwaveUploadRequest,
  type CompleteSoundwaveUploadResponse,
  type SoundwaveContentType,
} from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  ObjectTooLargeError,
  type ObjectStoragePort,
} from '../../shared/object-storage/object-storage.port';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
} from '../../shared/order-context/order-personalization-context.port';
import {
  SOURCE_PROCESSING_TRIGGER,
  type SourceProcessingTrigger,
} from '../../shared/source-processing/source-processing.port';
import { matchesAudioMagicBytes } from './audio-magic-bytes';
import {
  assertConsentUsable,
  assertOrderOwned,
} from './soundwave-upload.checks';
import {
  COMPLETED_SOURCE_STATUSES,
  SOUNDWAVE_SOURCE_TYPE,
} from './soundwave-upload.config';
import {
  soundwaveUploadErrors,
  SoundwaveUploadReason,
} from './soundwave-upload.errors';
import {
  SOUNDWAVE_UPLOAD_REPOSITORY,
  type SoundwaveUploadRepository,
  type UploadMetadata,
  type UploadSourceRecord,
} from './soundwave-upload.repository';
import {
  requireSegmentStartMs,
  requireUuid,
  requireWavecodeStyle,
} from './soundwave-upload.validation';

/**
 * PERSO-010. Reads the uploaded object and verifies it against what PERSO-009 declared
 * before the source becomes ACCEPTED. The WAVECODE style (default CLASSIC) is validated
 * against a static list and stored with the segment. Processing (PERSO-013) starts after commit.
 */
@Injectable()
export class CompleteSoundwaveUploadUseCase {
  private readonly logger = new Logger(CompleteSoundwaveUploadUseCase.name);

  constructor(
    @Inject(SOUNDWAVE_UPLOAD_REPOSITORY)
    private readonly uploads: SoundwaveUploadRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(SOURCE_PROCESSING_TRIGGER)
    private readonly processing: SourceProcessingTrigger,
  ) {}

  async execute(
    request: CompleteSoundwaveUploadRequest,
  ): Promise<CompleteSoundwaveUploadResponse> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      SoundwaveUploadReason.INVALID_ORDER_ID,
    );
    const uploadId = requireUuid(
      request.uploadId,
      SoundwaveUploadReason.INVALID_UPLOAD_ID,
    );
    const segmentStartMs = requireSegmentStartMs(request.segmentStartMs);
    const wavecodeStyle = requireWavecodeStyle(request.wavecodeStyle);

    // Throws (503) when Commerce is down: fail closed, never "not found".
    const order = assertOrderOwned(
      await this.orders.getOrderPersonalizationContext(orderId),
      actor.customerIdentityId,
    );

    const source = await this.uploads.findUpload(uploadId);
    const metadata = source?.metadata;
    if (
      source === undefined ||
      metadata === undefined ||
      source.ownerCustomerIdentityId.toLowerCase() !==
        actor.customerIdentityId.toLowerCase()
    ) {
      throw soundwaveUploadErrors.notFound(
        SoundwaveUploadReason.UPLOAD_NOT_FOUND,
      );
    }
    const consent = await this.uploads.findConsent(metadata.consentId);
    if (consent === undefined || consent.orderId.toLowerCase() !== orderId) {
      throw soundwaveUploadErrors.notFound(
        SoundwaveUploadReason.UPLOAD_NOT_FOUND,
      );
    }

    if (COMPLETED_SOURCE_STATUSES.includes(source.status)) {
      return toResponse(source.id, source.status);
    }
    if (source.status !== 'PENDING') {
      throw soundwaveUploadErrors.alreadyExists(
        SoundwaveUploadReason.UPLOAD_NOT_PENDING,
      );
    }
    if (segmentStartMs + SOUNDWAVE_SEGMENT_MS > metadata.durationMs) {
      throw soundwaveUploadErrors.invalid(
        SoundwaveUploadReason.SEGMENT_OUT_OF_RANGE,
      );
    }
    assertConsentUsable(order, consent, orderId, actor.customerIdentityId);
    if (consent.personalizationSourceId !== undefined) {
      throw soundwaveUploadErrors.alreadyExists(
        SoundwaveUploadReason.SOURCE_ALREADY_UPLOADED,
      );
    }

    await this.verifyObject(source, metadata);

    const outcome = await this.uploads.acceptUpload({
      sourceId: source.id,
      consentId: consent.id,
      orderId,
      segmentStartMs,
      wavecodeStyle,
      bindingMode: order.sourcePlanMode,
      now: new Date(),
    });

    // After commit. The source stays ACCEPTED if the seam fails; PERSO-013 can pick it up.
    if (outcome.accepted) {
      try {
        await this.processing.enqueue(source.id, 0);
      } catch (error: unknown) {
        this.logger.warn(
          `Processing was not queued for source ${source.id}: ${describe(error)}`,
        );
      }
    }
    return toResponse(source.id, outcome.status);
  }

  /**
   * Missing object: 422 and the row stays PENDING so the client can PUT again. Any other
   * mismatch removes the object and the row (DELETED / UPLOAD_INVALID): start over.
   */
  private async verifyObject(
    source: UploadSourceRecord,
    metadata: UploadMetadata,
  ): Promise<void> {
    const key = source.rawAssetKey;
    if (key === undefined) {
      throw soundwaveUploadErrors.notFound(
        SoundwaveUploadReason.UPLOAD_NOT_FOUND,
      );
    }
    const contentType = knownContentType(metadata.contentType);

    let bytes: Uint8Array | undefined;
    let tooLarge = false;
    try {
      bytes = await this.storage.getObject(key, SOUNDWAVE_MAX_SIZE_BYTES);
    } catch (error: unknown) {
      if (!(error instanceof ObjectTooLargeError)) {
        this.logger.error(
          `Reading upload ${source.id} failed: ${describe(error)}`,
        );
        throw soundwaveUploadErrors.storageUnavailable();
      }
      tooLarge = true;
    }
    if (bytes === undefined && !tooLarge) {
      throw soundwaveUploadErrors.invalid(SoundwaveUploadReason.UPLOAD_INVALID);
    }

    const valid =
      bytes !== undefined &&
      contentType !== undefined &&
      bytes.byteLength === metadata.sizeBytes &&
      sha256Hex(bytes) === source.rawChecksum &&
      matchesAudioMagicBytes(contentType, bytes);
    if (valid) {
      return;
    }
    await this.discard(source.id, key);
    throw soundwaveUploadErrors.invalid(SoundwaveUploadReason.UPLOAD_INVALID);
  }

  private async discard(sourceId: string, key: string): Promise<void> {
    try {
      await this.storage.deleteObject(key);
    } catch (error: unknown) {
      this.logger.warn(
        `Invalid upload object of ${sourceId} was not deleted: ${describe(error)}`,
      );
    }
    await this.uploads.rejectUpload(sourceId, new Date());
  }
}

function knownContentType(value: string): SoundwaveContentType | undefined {
  return SOUNDWAVE_CONTENT_TYPES.find((type) => type === value);
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function toResponse(
  sourceId: string,
  status: string,
): CompleteSoundwaveUploadResponse {
  return { sourceId, sourceType: SOUNDWAVE_SOURCE_TYPE, status };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
