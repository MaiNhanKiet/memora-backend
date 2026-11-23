import type { SourcePlanMode } from '../../shared/order-context/order-personalization-context.port';

/** Consent facts the upload needs. Never carries evidence_metadata_json. */
export interface UploadConsentRecord {
  readonly id: string;
  readonly orderId: string;
  readonly customerIdentityId: string;
  readonly consentType: string;
  readonly status: string;
  /** Undefined while the consent has no source. */
  readonly personalizationSourceId: string | undefined;
  readonly ringItemIds: readonly string[];
}

/** Stored in personalization_sources.metadata_json. Internal only: never sent to a client. */
export interface UploadMetadata {
  readonly consentId: string;
  readonly orderId: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly durationMs: number;
  readonly origin: string;
}

export interface UploadSourceRecord {
  readonly id: string;
  readonly ownerCustomerIdentityId: string;
  readonly status: string;
  readonly rawAssetKey: string | undefined;
  readonly rawChecksum: string | undefined;
  /** Undefined when the row has no readable upload metadata. */
  readonly metadata: UploadMetadata | undefined;
}

export interface CreatePendingUploadInput {
  readonly sourceId: string;
  readonly ownerCustomerIdentityId: string;
  readonly uploadedByUserId: string;
  readonly rawAssetKey: string;
  readonly sha256: string;
  readonly metadata: UploadMetadata;
  readonly now: Date;
}

export interface AcceptUploadInput {
  readonly sourceId: string;
  readonly consentId: string;
  readonly orderId: string;
  readonly segmentStartMs: number;
  /** Validated; stored as metadata_json.wavecodeStyle. */
  readonly wavecodeStyle: string;
  readonly bindingMode: SourcePlanMode;
  readonly now: Date;
}

export interface AcceptUploadOutcome {
  readonly status: string;
  /** False when the source had already been accepted (idempotent repeat). */
  readonly accepted: boolean;
}

export interface SoundwaveUploadRepository {
  findConsent(consentId: string): Promise<UploadConsentRecord | undefined>;
  findUpload(sourceId: string): Promise<UploadSourceRecord | undefined>;
  /**
   * One transaction under the `soundwave-consent:{id}` lock: re-checks that the consent is
   * ACCEPTED and unlinked (SOURCE_ALREADY_UPLOADED), marks an older PENDING upload of the
   * same consent DELETED / SUPERSEDED, creates the PENDING source. Returns the raw keys of
   * the superseded uploads; the caller deletes the objects after commit.
   */
  createPendingUpload(
    input: CreatePendingUploadInput,
  ): Promise<{ readonly supersededKeys: readonly string[] }>;
  /** PENDING -> DELETED / UPLOAD_INVALID. No-op when the row is no longer PENDING. */
  rejectUpload(sourceId: string, now: Date): Promise<void>;
  /**
   * One transaction under the consent lock: source -> ACCEPTED (segment stored), consent
   * linked, one binding per consent Ring Item (D-P-18). An already accepted source is
   * returned unchanged; any other non-PENDING status is UPLOAD_NOT_PENDING.
   */
  acceptUpload(input: AcceptUploadInput): Promise<AcceptUploadOutcome>;
}

export const SOUNDWAVE_UPLOAD_REPOSITORY = Symbol(
  'SOUNDWAVE_UPLOAD_REPOSITORY',
);
