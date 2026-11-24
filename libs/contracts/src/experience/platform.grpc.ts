// gRPC contract for Experience Platform Sharing (3D Ring Preview Share Links), mirrors proto/experience/v1/platform.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const PLATFORM_SHARING_SERVICE_NAME = 'PlatformSharingService';

export const SHARE_LINK_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export type ShareLinkStatus = (typeof SHARE_LINK_STATUSES)[number];

// ---------------------------------------------------------------------------
// Resolve Share Link
// ---------------------------------------------------------------------------

export interface ResolveShareLinkRequest {
  shareToken: string;
}

export interface ResolveShareLinkResponse {
  id: string;
  shareToken: string;
  status: ShareLinkStatus;
  expiresAt: string;
  ringTemplateId?: string;
  ringDesignDraftId?: string;
  sanitizedSnapshotJson: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Create Share Link
// ---------------------------------------------------------------------------

export interface CreateShareLinkRequest {
  actor: VerifiedActor;
  ringDesignDraftId?: string;
  ringTemplateId?: string;
  sanitizedSnapshotJson: string;
  expiresInDays?: number;
}

export interface CreateShareLinkResponse {
  id: string;
  shareToken: string;
  shareUrl: string;
  status: ShareLinkStatus;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Revoke Share Link
// ---------------------------------------------------------------------------

export interface RevokeShareLinkRequest {
  actor: VerifiedActor;
  shareLinkId: string;
}

export interface RevokeShareLinkResponse {
  id: string;
  status: ShareLinkStatus;
  revokedAt: string;
}

// ---------------------------------------------------------------------------
// gRPC Client & Controller Interfaces
// ---------------------------------------------------------------------------

export interface PlatformSharingServiceClient {
  resolveShareLink(
    request: ResolveShareLinkRequest,
    metadata?: Metadata,
  ): Observable<ResolveShareLinkResponse>;

  createShareLink(
    request: CreateShareLinkRequest,
    metadata?: Metadata,
  ): Observable<CreateShareLinkResponse>;

  revokeShareLink(
    request: RevokeShareLinkRequest,
    metadata?: Metadata,
  ): Observable<RevokeShareLinkResponse>;
}

export interface PlatformSharingServiceGrpcController {
  resolveShareLink(
    request: ResolveShareLinkRequest,
    metadata?: Metadata,
  ): Promise<ResolveShareLinkResponse>;

  createShareLink(
    request: CreateShareLinkRequest,
    metadata?: Metadata,
  ): Promise<CreateShareLinkResponse>;

  revokeShareLink(
    request: RevokeShareLinkRequest,
    metadata?: Metadata,
  ): Promise<RevokeShareLinkResponse>;
}
