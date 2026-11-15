// gRPC contract for fingerprint capture sessions, mirrors
// proto/personalization/v1/personalization.proto (FingerprintCaptureService).

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME =
  'FingerprintCaptureService';

export const CAPTURE_MAX_ATTEMPTS = 3;

export const CAPTURE_SESSION_STATUSES = [
  'CREATED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;
export type CaptureSessionStatus = (typeof CAPTURE_SESSION_STATUSES)[number];

export const CAPTURE_ATTEMPT_RESULTS = [
  'PENDING_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'ERROR',
] as const;
export type CaptureAttemptResult = (typeof CAPTURE_ATTEMPT_RESULTS)[number];

/** Threshold suggestion only; the capture staff decides. */
export const CAPTURE_SUGGESTIONS = ['PASS', 'LOW_QUALITY'] as const;
export type CaptureSuggestion = (typeof CAPTURE_SUGGESTIONS)[number];

export interface CaptureAttemptSummary {
  attemptNo: number;
  result: string;
  qualityScore?: number;
  attemptedAt: string;
  /** PASS | LOW_QUALITY. */
  suggestion?: string;
}

export interface CaptureSession {
  sessionId: string;
  orderId: string;
  consentId: string;
  deviceCode: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  expiresAt: string;
  createdAt: string;
  /** Set once COMPLETED. */
  acceptedSourceId?: string;
  attempts: CaptureAttemptSummary[];
}

export interface CreateCaptureSessionRequest {
  actor: VerifiedActor;
  orderId: string;
  consentId: string;
  deviceCode: string;
}

export interface GetCaptureSessionRequest {
  actor: VerifiedActor;
  sessionId: string;
}

export interface CompleteCaptureSessionRequest {
  actor: VerifiedActor;
  sessionId: string;
  /** The PENDING_REVIEW attempt the staff accepts. */
  attemptNo: number;
}

export interface GetCaptureAttemptImageRequest {
  actor: VerifiedActor;
  sessionId: string;
  attemptNo: number;
}

export interface CaptureAttemptImage {
  attemptNo: number;
  /** Presigned GET URL, valid 60 s. Never log it. */
  imageUrl: string;
  expiresAt: string;
  contentType: string;
}

export interface RejectCaptureAttemptRequest {
  actor: VerifiedActor;
  sessionId: string;
  attemptNo: number;
}

export interface FingerprintCaptureServiceHandler {
  createCaptureSession(
    request: CreateCaptureSessionRequest,
  ): Promise<CaptureSession>;
  getCaptureSession(request: GetCaptureSessionRequest): Promise<CaptureSession>;
  completeCaptureSession(
    request: CompleteCaptureSessionRequest,
  ): Promise<CaptureSession>;
  getCaptureAttemptImage(
    request: GetCaptureAttemptImageRequest,
  ): Promise<CaptureAttemptImage>;
  rejectCaptureAttempt(
    request: RejectCaptureAttemptRequest,
  ): Promise<CaptureSession>;
}

export interface PersonalizationFingerprintCaptureServiceClient {
  createCaptureSession(
    request: CreateCaptureSessionRequest,
    metadata?: Metadata,
  ): Observable<CaptureSession>;
  getCaptureSession(
    request: GetCaptureSessionRequest,
    metadata?: Metadata,
  ): Observable<CaptureSession>;
  completeCaptureSession(
    request: CompleteCaptureSessionRequest,
    metadata?: Metadata,
  ): Observable<CaptureSession>;
  getCaptureAttemptImage(
    request: GetCaptureAttemptImageRequest,
    metadata?: Metadata,
  ): Observable<CaptureAttemptImage>;
  rejectCaptureAttempt(
    request: RejectCaptureAttemptRequest,
    metadata?: Metadata,
  ): Observable<CaptureSession>;
}
