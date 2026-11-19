// gRPC contract for Personalization sources, mirrors
// proto/personalization/v1/personalization.proto (PersonalizationSourceService).

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const PERSONALIZATION_SOURCE_SERVICE_NAME =
  'PersonalizationSourceService';

export const SOURCE_TYPES = ['FINGERPRINT', 'SOUNDWAVE'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const SOURCE_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'PROCESSING',
  'READY',
  'PROCESSING_FAILED',
  'DELETED',
] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

export const SOURCE_BINDING_MODES = ['N/A', 'SHARED', 'SEPARATE'] as const;
export type SourceBindingMode = (typeof SOURCE_BINDING_MODES)[number];

/** Never carries object keys, checksums or metadata (NFR-S-01). */
export interface PersonalizationSource {
  sourceId: string;
  sourceType: string;
  status: string;
  /** Unset until a processing job records a failure code. */
  failureCode?: string;
  /** ISO-8601 UTC; unset while the source is not accepted. */
  acceptedAt?: string;
  ringItemIds: string[];
  /** Unset while the source has no active binding in the order. */
  bindingMode?: string;
}

export interface ListOrderSourcesRequest {
  actor: VerifiedActor;
  orderId: string;
}

export interface ListOrderSourcesResponse {
  items: PersonalizationSource[];
}

export interface PersonalizationSourceServiceHandler {
  listOrderSources(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse>;
}

export interface PersonalizationSourceServiceClient {
  listOrderSources(
    request: ListOrderSourcesRequest,
    metadata?: Metadata,
  ): Observable<ListOrderSourcesResponse>;
}
