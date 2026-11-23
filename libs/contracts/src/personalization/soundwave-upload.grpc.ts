// gRPC contract for Soundwave audio uploads (PERSO-009 / PERSO-010), mirrors
// proto/personalization/v1/personalization.proto (SoundwaveUploadService).

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME =
  'SoundwaveUploadService';

export const SOUNDWAVE_CONTENT_TYPES = [
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
] as const;
export type SoundwaveContentType = (typeof SOUNDWAVE_CONTENT_TYPES)[number];

export const SOUNDWAVE_UPLOAD_ORIGINS = ['UPLOAD', 'IN_APP_RECORDING'] as const;
export type SoundwaveUploadOrigin = (typeof SOUNDWAVE_UPLOAD_ORIGINS)[number];

/** D-P-14: up to 10 MiB. */
export const SOUNDWAVE_MAX_SIZE_BYTES = 10_485_760;
/** D-P-14: the recording or file is 3..30 s; the selected segment is exactly 3 s. */
export const SOUNDWAVE_MIN_DURATION_MS = 3000;
export const SOUNDWAVE_MAX_DURATION_MS = 30_000;
export const SOUNDWAVE_SEGMENT_MS = 3000;

/** PERSO-010 / PERSO-031: selectable WAVECODE looks. Static list; the worker is never asked to validate. */
export const SOUNDWAVE_WAVECODE_STYLES = [
  'CLASSIC',
  'HAIRLINE',
  'OSCILLOSCOPE',
] as const;
export type SoundwaveWavecodeStyle = (typeof SOUNDWAVE_WAVECODE_STYLES)[number];
export const SOUNDWAVE_DEFAULT_WAVECODE_STYLE: SoundwaveWavecodeStyle =
  'CLASSIC';

export interface InitiateSoundwaveUploadRequest {
  actor: VerifiedActor;
  orderId: string;
  consentId: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  origin: string;
  durationMs: number;
}

/** `uploadUrl` is a short-lived credential: never log it. */
export interface InitiateSoundwaveUploadResponse {
  uploadId: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
  /** ISO-8601 UTC. */
  expiresAt: string;
}

export interface CompleteSoundwaveUploadRequest {
  actor: VerifiedActor;
  orderId: string;
  uploadId: string;
  segmentStartMs: number;
  /** Unset or empty means CLASSIC. */
  wavecodeStyle?: string;
}

export interface CompleteSoundwaveUploadResponse {
  sourceId: string;
  sourceType: string;
  status: string;
}

/** PERSO-031. No actor: public read. */
export type ListSoundwaveStylesRequest = Record<string, never>;

export interface SoundwaveStyle {
  code: string;
  name: string;
  description: string;
  decoder: string;
  sampleSvg: string;
}

export interface ListSoundwaveStylesResponse {
  defaultStyle: string;
  styles: SoundwaveStyle[];
}

export interface SoundwaveUploadServiceHandler {
  initiateSoundwaveUpload(
    request: InitiateSoundwaveUploadRequest,
  ): Promise<InitiateSoundwaveUploadResponse>;
  completeSoundwaveUpload(
    request: CompleteSoundwaveUploadRequest,
  ): Promise<CompleteSoundwaveUploadResponse>;
  listSoundwaveStyles(
    request: ListSoundwaveStylesRequest,
  ): Promise<ListSoundwaveStylesResponse>;
}

export interface SoundwaveUploadServiceClient {
  initiateSoundwaveUpload(
    request: InitiateSoundwaveUploadRequest,
    metadata?: Metadata,
  ): Observable<InitiateSoundwaveUploadResponse>;
  completeSoundwaveUpload(
    request: CompleteSoundwaveUploadRequest,
    metadata?: Metadata,
  ): Observable<CompleteSoundwaveUploadResponse>;
  listSoundwaveStyles(
    request: ListSoundwaveStylesRequest,
    metadata?: Metadata,
  ): Observable<ListSoundwaveStylesResponse>;
}
