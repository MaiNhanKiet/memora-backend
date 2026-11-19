import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type {
  InitiateSoundwaveUploadRequest,
  InitiateSoundwaveUploadResponse,
} from '@app/contracts';
import {
  OBJECT_STORAGE_PORT,
  type ObjectStoragePort,
  type PresignedUrl,
} from '../../shared/object-storage/object-storage.port';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
} from '../../shared/order-context/order-personalization-context.port';
import {
  assertConsentUsable,
  assertOrderOwned,
} from './soundwave-upload.checks';
import {
  SOUNDWAVE_UPLOAD_CONFIG,
  soundwaveRawAssetKey,
  type SoundwaveUploadConfig,
} from './soundwave-upload.config';
import {
  soundwaveUploadErrors,
  SoundwaveUploadReason,
} from './soundwave-upload.errors';
import {
  SOUNDWAVE_UPLOAD_REPOSITORY,
  type SoundwaveUploadRepository,
} from './soundwave-upload.repository';
import {
  requireContentType,
  requireDurationMs,
  requireOrigin,
  requireSha256,
  requireSizeBytes,
  requireUuid,
} from './soundwave-upload.validation';

/**
 * PERSO-009. Order and payment facts come only from Commerce. The presigned URL is a
 * credential: it is returned once and never logged.
 */
@Injectable()
export class InitiateSoundwaveUploadUseCase {
  private readonly logger = new Logger(InitiateSoundwaveUploadUseCase.name);

  constructor(
    @Inject(SOUNDWAVE_UPLOAD_REPOSITORY)
    private readonly uploads: SoundwaveUploadRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
    @Inject(SOUNDWAVE_UPLOAD_CONFIG)
    private readonly config: SoundwaveUploadConfig,
  ) {}

  async execute(
    request: InitiateSoundwaveUploadRequest,
  ): Promise<InitiateSoundwaveUploadResponse> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      SoundwaveUploadReason.INVALID_ORDER_ID,
    );
    const consentId = requireUuid(
      request.consentId,
      SoundwaveUploadReason.INVALID_CONSENT_ID,
    );
    const contentType = requireContentType(request.contentType);
    const sizeBytes = requireSizeBytes(request.sizeBytes);
    const sha256 = requireSha256(request.sha256);
    const origin = requireOrigin(request.origin);
    const durationMs = requireDurationMs(request.durationMs);

    // Throws (503) when Commerce is down: fail closed, never "not found".
    const order = assertOrderOwned(
      await this.orders.getOrderPersonalizationContext(orderId),
      actor.customerIdentityId,
    );
    const consent = assertConsentUsable(
      order,
      await this.uploads.findConsent(consentId),
      orderId,
      actor.customerIdentityId,
    );
    if (consent.personalizationSourceId !== undefined) {
      throw soundwaveUploadErrors.alreadyExists(
        SoundwaveUploadReason.SOURCE_ALREADY_UPLOADED,
      );
    }

    // Signing is local, so a storage failure leaves no row behind.
    const sourceId = randomUUID();
    const rawAssetKey = soundwaveRawAssetKey(sourceId);
    let presigned: PresignedUrl;
    try {
      presigned = await this.storage.presignPut(rawAssetKey, {
        expiresInSeconds: this.config.uploadUrlTtlSeconds,
        contentType,
        contentLength: sizeBytes,
      });
    } catch (error: unknown) {
      this.logger.error(`Presign failed: ${describe(error)}`);
      throw soundwaveUploadErrors.storageUnavailable();
    }

    const { supersededKeys } = await this.uploads.createPendingUpload({
      sourceId,
      ownerCustomerIdentityId: actor.customerIdentityId,
      uploadedByUserId: actor.userId,
      rawAssetKey,
      sha256,
      metadata: {
        consentId,
        orderId,
        contentType,
        sizeBytes,
        durationMs,
        origin,
      },
      now: new Date(),
    });

    // After commit. A failed delete leaves an unreferenced object, not an error.
    for (const key of supersededKeys) {
      try {
        await this.storage.deleteObject(key);
      } catch (error: unknown) {
        this.logger.warn(
          `Superseded upload object was not deleted: ${describe(error)}`,
        );
      }
    }
    this.logger.log(
      `Soundwave upload initiated: source=${sourceId} order=${orderId} consent=${consentId} superseded=${supersededKeys.length}`,
    );
    return {
      uploadId: sourceId,
      uploadUrl: presigned.url,
      uploadHeaders: { 'Content-Type': contentType },
      expiresAt: presigned.expiresAt.toISOString(),
    };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
