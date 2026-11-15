// gRPC contract for Personalization Consent, mirrors proto/personalization/v1/personalization.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const PERSONALIZATION_PACKAGE = 'memora.personalization.v1';
export const PERSONALIZATION_CONSENT_SERVICE_NAME = 'ConsentService';

export const CONSENT_TYPES = [
  'FINGERPRINT_PROCESSING',
  'SOUNDWAVE_PROCESSING',
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_STATUSES = ['ACCEPTED', 'REVOKED'] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export interface Consent {
  consentId: string;
  orderId: string;
  consentType: string;
  policyVersion: string;
  status: string;
  acceptedAt: string;
  /** Unset while ACCEPTED. */
  revokedAt?: string;
  ringItemIds: string[];
}

export interface AcceptConsentRequest {
  actor: VerifiedActor;
  orderId: string;
  consentType: string;
  policyVersion: string;
  ringItemIds: string[];
}

export interface ListConsentsRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface ListConsentsResponse {
  items: Consent[];
}

export interface RevokeConsentRequest {
  actor: VerifiedActor;
  orderId: string;
  consentId: string;
}

export interface ConsentServiceHandler {
  acceptConsent(request: AcceptConsentRequest): Promise<Consent>;
  listConsents(request: ListConsentsRequest): Promise<ListConsentsResponse>;
  revokeConsent(request: RevokeConsentRequest): Promise<Consent>;
}

export interface PersonalizationConsentServiceClient {
  acceptConsent(
    request: AcceptConsentRequest,
    metadata?: Metadata,
  ): Observable<Consent>;
  listConsents(
    request: ListConsentsRequest,
    metadata?: Metadata,
  ): Observable<ListConsentsResponse>;
  revokeConsent(
    request: RevokeConsentRequest,
    metadata?: Metadata,
  ): Observable<Consent>;
}
