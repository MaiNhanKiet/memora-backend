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

export interface GetSourceProcessingRequest {
  actor: VerifiedActor;
  sourceId: string;
}

/** Never carries object keys, checksums, artwork or wavecode. */
export interface SourceProcessing {
  sourceId: string;
  sourceType: string;
  status: string;
  /** Unset unless processing failed. */
  failureCode?: string;
  /** ISO-8601 UTC; unset until the job starts. */
  startedAt?: string;
  /** ISO-8601 UTC; unset until READY or PROCESSING_FAILED. */
  finishedAt?: string;
}

/** PERSO-032..034. Never carries object keys or checksums. */
export interface GetSoundwaveWavecodeRequest {
  actor: VerifiedActor;
  sourceId: string;
}

export interface SelectWavecodeStyleRequest {
  actor: VerifiedActor;
  sourceId: string;
  style: string;
}

export interface AcceptWavecodeStyleRequest {
  actor: VerifiedActor;
  sourceId: string;
  /** Unset or empty means the current style. */
  style?: string;
}

export interface WavecodeStyleState {
  code: string;
  name: string;
  generated: boolean;
  /** 300 s presigned URL: a credential, never log it. Unset unless generated. */
  previewSvgUrl?: string;
  previewPngUrl?: string;
}

export interface ResegmentSoundwaveSourceRequest {
  actor: VerifiedActor;
  sourceId: string;
  /** Integer >= 0; segmentStartMs + 3000 must not exceed the audio duration. */
  segmentStartMs: number;
  /** Unset or empty keeps the current style. */
  wavecodeStyle?: string;
}

export interface SoundwaveWavecode {
  /** Source status: PENDING | ACCEPTED | PROCESSING | READY | PROCESSING_FAILED. */
  status: string;
  /** Unset unless processing failed. */
  failureCode?: string;
  /** Worker-measured duration when known, else the declared one. */
  durationMs?: number;
  segmentStartMs?: number;
  segmentDurationMs: number;
  /** 300 s presigned URLs: credentials, never log them. Unset when there is no object. */
  rawAudioUrl?: string;
  segmentAudioUrl?: string;
  currentStyle: string;
  /** Unset until PERSO-034. */
  acceptedStyle?: string;
  styles: WavecodeStyleState[];
}

export interface PersonalizationSourceServiceHandler {
  listOrderSources(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse>;
  getSourceProcessing(
    request: GetSourceProcessingRequest,
  ): Promise<SourceProcessing>;
  getSoundwaveWavecode(
    request: GetSoundwaveWavecodeRequest,
  ): Promise<SoundwaveWavecode>;
  selectWavecodeStyle(
    request: SelectWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode>;
  acceptWavecodeStyle(
    request: AcceptWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode>;
  resegmentSoundwaveSource(
    request: ResegmentSoundwaveSourceRequest,
  ): Promise<SoundwaveWavecode>;
}

export interface PersonalizationSourceServiceClient {
  listOrderSources(
    request: ListOrderSourcesRequest,
    metadata?: Metadata,
  ): Observable<ListOrderSourcesResponse>;
  getSourceProcessing(
    request: GetSourceProcessingRequest,
    metadata?: Metadata,
  ): Observable<SourceProcessing>;
  getSoundwaveWavecode(
    request: GetSoundwaveWavecodeRequest,
    metadata?: Metadata,
  ): Observable<SoundwaveWavecode>;
  selectWavecodeStyle(
    request: SelectWavecodeStyleRequest,
    metadata?: Metadata,
  ): Observable<SoundwaveWavecode>;
  acceptWavecodeStyle(
    request: AcceptWavecodeStyleRequest,
    metadata?: Metadata,
  ): Observable<SoundwaveWavecode>;
  resegmentSoundwaveSource(
    request: ResegmentSoundwaveSourceRequest,
    metadata?: Metadata,
  ): Observable<SoundwaveWavecode>;
}
