import type { ConsentType } from '@app/contracts';

/** Consent as the application layer sees it. Never carries evidence_metadata_json. */
export interface ConsentRecord {
  readonly id: string;
  readonly orderId: string;
  readonly consentType: string;
  readonly policyVersion: string;
  readonly status: string;
  readonly acceptedAt: Date;
  readonly revokedAt: Date | null;
  readonly ringItemIds: readonly string[];
}

export interface CreateAcceptedConsentInput {
  readonly customerIdentityId: string;
  readonly orderId: string;
  readonly consentType: ConsentType;
  readonly policyVersion: string;
  readonly ringItemIds: readonly string[];
}

export interface CreateAcceptedConsentResult {
  readonly consent: ConsentRecord;
  /** False when an identical ACCEPTED consent already existed (idempotent replay). */
  readonly created: boolean;
}

export interface ConsentRepository {
  /**
   * Atomic and race-safe: in one transaction, returns the existing ACCEPTED consent
   * with the same customer, order, type and exact item set (created=false), or
   * throws ConflictException('ITEM_ALREADY_CONSENTED') when any item is already in
   * another ACCEPTED consent of the same type for the order, or inserts the consent
   * and its items (created=true).
   */
  createAcceptedIfAbsent(
    input: CreateAcceptedConsentInput,
  ): Promise<CreateAcceptedConsentResult>;

  /** Newest first; filtered by order AND customer. */
  listByOrderForCustomer(
    orderId: string,
    customerIdentityId: string,
  ): Promise<ConsentRecord[]>;

  findByIdForCustomer(
    consentId: string,
    orderId: string,
    customerIdentityId: string,
  ): Promise<ConsentRecord | undefined>;

  /** Conditional update `WHERE status = 'ACCEPTED'`; a no-op when already REVOKED. */
  markRevoked(consentId: string, revokedAt: Date): Promise<void>;
}

export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');
export const CONSENT_POLICY_VERSION = Symbol('CONSENT_POLICY_VERSION');
