import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  COMPLETED_SOURCE_STATUSES,
  DELETE_REASON_SUPERSEDED,
  DELETE_REASON_UPLOAD_INVALID,
  SOUNDWAVE_SOURCE_TYPE,
} from '../application/soundwave-upload.config';
import {
  soundwaveUploadErrors,
  SoundwaveUploadReason,
} from '../application/soundwave-upload.errors';
import type {
  AcceptUploadInput,
  AcceptUploadOutcome,
  CreatePendingUploadInput,
  SoundwaveUploadRepository,
  UploadConsentRecord,
  UploadMetadata,
  UploadSourceRecord,
} from '../application/soundwave-upload.repository';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class PrismaSoundwaveUploadRepository implements SoundwaveUploadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConsent(
    consentId: string,
  ): Promise<UploadConsentRecord | undefined> {
    const row = await this.prisma.consents.findUnique({
      where: { id: consentId },
      select: {
        id: true,
        order_id: true,
        customer_identity_id: true,
        consent_type: true,
        status: true,
        personalization_source_id: true,
        consent_ring_items: { select: { ring_item_id: true } },
      },
    });
    if (row === null) {
      return undefined;
    }
    return {
      id: row.id,
      orderId: row.order_id ?? '',
      customerIdentityId: row.customer_identity_id,
      consentType: row.consent_type,
      status: row.status,
      personalizationSourceId: row.personalization_source_id ?? undefined,
      ringItemIds: row.consent_ring_items.map((item) => item.ring_item_id),
    };
  }

  async findUpload(sourceId: string): Promise<UploadSourceRecord | undefined> {
    const row = await this.prisma.personalization_sources.findFirst({
      where: { id: sourceId, source_type: SOUNDWAVE_SOURCE_TYPE },
      select: {
        id: true,
        owner_customer_identity_id: true,
        status: true,
        raw_asset_key: true,
        raw_checksum: true,
        metadata_json: true,
      },
    });
    if (row === null) {
      return undefined;
    }
    return {
      id: row.id,
      ownerCustomerIdentityId: row.owner_customer_identity_id,
      status: row.status,
      rawAssetKey: row.raw_asset_key ?? undefined,
      rawChecksum: row.raw_checksum ?? undefined,
      metadata: readMetadata(row.metadata_json),
    };
  }

  createPendingUpload(
    input: CreatePendingUploadInput,
  ): Promise<{ readonly supersededKeys: readonly string[] }> {
    return this.prisma.$transaction(async (tx) => {
      await lock(tx, `soundwave-consent:${input.metadata.consentId}`);

      const consent = await tx.consents.findUnique({
        where: { id: input.metadata.consentId },
        select: { status: true, personalization_source_id: true },
      });
      if (consent === null || consent.status !== 'ACCEPTED') {
        throw soundwaveUploadErrors.precondition(
          SoundwaveUploadReason.CONSENT_NOT_ACCEPTED,
        );
      }
      if (consent.personalization_source_id !== null) {
        throw soundwaveUploadErrors.alreadyExists(
          SoundwaveUploadReason.SOURCE_ALREADY_UPLOADED,
        );
      }

      // One PENDING upload per consent: the older one is superseded (DDL needs both columns).
      const older = await tx.personalization_sources.findMany({
        where: {
          source_type: SOUNDWAVE_SOURCE_TYPE,
          status: 'PENDING',
          owner_customer_identity_id: input.ownerCustomerIdentityId,
          metadata_json: {
            path: ['consentId'],
            equals: input.metadata.consentId,
          },
        },
        select: { id: true, raw_asset_key: true },
      });
      if (older.length > 0) {
        await tx.personalization_sources.updateMany({
          where: { id: { in: older.map((row) => row.id) }, status: 'PENDING' },
          data: {
            status: 'DELETED',
            delete_reason: DELETE_REASON_SUPERSEDED,
            deleted_at: input.now,
          },
        });
      }

      await tx.personalization_sources.create({
        data: {
          id: input.sourceId,
          owner_customer_identity_id: input.ownerCustomerIdentityId,
          source_type: SOUNDWAVE_SOURCE_TYPE,
          status: 'PENDING',
          raw_asset_key: input.rawAssetKey,
          raw_checksum: input.sha256,
          captured_or_uploaded_by_user_id: input.uploadedByUserId,
          metadata_json: { ...input.metadata },
        },
        select: { id: true },
      });
      return {
        supersededKeys: older.flatMap((row) =>
          row.raw_asset_key === null ? [] : [row.raw_asset_key],
        ),
      };
    });
  }

  async rejectUpload(sourceId: string, now: Date): Promise<void> {
    await this.prisma.personalization_sources.updateMany({
      where: { id: sourceId, status: 'PENDING' },
      data: {
        status: 'DELETED',
        delete_reason: DELETE_REASON_UPLOAD_INVALID,
        deleted_at: now,
      },
    });
  }

  acceptUpload(input: AcceptUploadInput): Promise<AcceptUploadOutcome> {
    return this.prisma.$transaction(async (tx) => {
      await lock(tx, `soundwave-consent:${input.consentId}`);

      const source = await tx.personalization_sources.findFirst({
        where: { id: input.sourceId, source_type: SOUNDWAVE_SOURCE_TYPE },
        select: { status: true, metadata_json: true },
      });
      if (source === null) {
        throw soundwaveUploadErrors.notFound(
          SoundwaveUploadReason.UPLOAD_NOT_FOUND,
        );
      }
      if (COMPLETED_SOURCE_STATUSES.includes(source.status)) {
        return { status: source.status, accepted: false };
      }
      if (source.status !== 'PENDING') {
        throw soundwaveUploadErrors.alreadyExists(
          SoundwaveUploadReason.UPLOAD_NOT_PENDING,
        );
      }

      const consent = await tx.consents.findUnique({
        where: { id: input.consentId },
        select: {
          status: true,
          personalization_source_id: true,
          consent_ring_items: { select: { ring_item_id: true } },
        },
      });
      if (consent === null || consent.status !== 'ACCEPTED') {
        throw soundwaveUploadErrors.precondition(
          SoundwaveUploadReason.CONSENT_NOT_ACCEPTED,
        );
      }
      if (consent.personalization_source_id !== null) {
        throw soundwaveUploadErrors.alreadyExists(
          SoundwaveUploadReason.SOURCE_ALREADY_UPLOADED,
        );
      }

      // D-P-18: every Ring Item of the consent gets one active binding. An item that is
      // already bound fails the whole complete (the transaction rolls back).
      const ringItemIds = consent.consent_ring_items.map(
        (item) => item.ring_item_id,
      );
      const alreadyBound = await tx.source_bindings.findFirst({
        where: { ring_item_id: { in: ringItemIds }, released_at: null },
        select: { id: true },
      });
      if (alreadyBound !== null) {
        throw soundwaveUploadErrors.precondition(
          SoundwaveUploadReason.RING_ITEM_ALREADY_BOUND,
        );
      }

      // Conditional on PENDING: a parallel complete cannot accept the source twice.
      const updated = await tx.personalization_sources.updateMany({
        where: { id: input.sourceId, status: 'PENDING' },
        data: {
          status: 'ACCEPTED',
          accepted_at: input.now,
          captured_at: input.now,
          metadata_json: {
            ...metadataRecord(source.metadata_json),
            segmentStartMs: input.segmentStartMs,
            wavecodeStyle: input.wavecodeStyle,
          },
        },
      });
      if (updated.count !== 1) {
        throw soundwaveUploadErrors.alreadyExists(
          SoundwaveUploadReason.UPLOAD_NOT_PENDING,
        );
      }
      await tx.consents.update({
        where: { id: input.consentId },
        data: { personalization_source_id: input.sourceId },
      });
      try {
        await tx.source_bindings.createMany({
          data: ringItemIds.map((ringItemId) => ({
            order_id: input.orderId,
            ring_item_id: ringItemId,
            personalization_source_id: input.sourceId,
            binding_mode: input.bindingMode,
          })),
        });
      } catch (error: unknown) {
        // A parallel complete bound the same item first: the partial unique index
        // (one active binding per item) rejects this one.
        if (isUniqueViolation(error)) {
          throw soundwaveUploadErrors.precondition(
            SoundwaveUploadReason.RING_ITEM_ALREADY_BOUND,
          );
        }
        throw error;
      }
      return { status: 'ACCEPTED', accepted: true };
    });
  }
}

/** Serializes concurrent writers on one key until the transaction ends. */
async function lock(tx: Tx, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}

/** Prisma P2002: a unique index (here the one-active-binding-per-item index) refused the row. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function metadataRecord(raw: unknown): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result[key] = value;
      }
    }
  }
  return result;
}

function readMetadata(raw: unknown): UploadMetadata | undefined {
  const { consentId, orderId, contentType, sizeBytes, durationMs, origin } =
    metadataRecord(raw);
  if (
    typeof consentId === 'string' &&
    typeof orderId === 'string' &&
    typeof contentType === 'string' &&
    typeof sizeBytes === 'number' &&
    typeof durationMs === 'number' &&
    typeof origin === 'string'
  ) {
    return { consentId, orderId, contentType, sizeBytes, durationMs, origin };
  }
  return undefined;
}
