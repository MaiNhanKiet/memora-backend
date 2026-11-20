// gRPC contract for Experience Memory Cards & Digital Memories, mirrors proto/experience/v1/memory.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export const EXPERIENCE_PACKAGE = 'memora.experience.v1';
export const MEMORY_SERVICE_NAME = 'MemoryService';

export const MEMORY_CARD_STATUSES = [
  'PENDING',
  'ACTIVE',
  'DISABLED',
  'DELETED',
] as const;
export type MemoryCardStatus = (typeof MEMORY_CARD_STATUSES)[number];

export const MEMORY_CONTENT_TYPES = [
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
] as const;
export type MemoryContentType = (typeof MEMORY_CONTENT_TYPES)[number];

export const ACCESS_GRANT_STATUSES = [
  'PENDING',
  'ACTIVE',
  'REVOKED',
  'EXPIRED',
] as const;
export type AccessGrantStatus = (typeof ACCESS_GRANT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Memory Cards Models & Requests
// ---------------------------------------------------------------------------

export interface MemoryCardSummary {
  id: string;
  ringItemId: string;
  ownerCustomerIdentityId: string;
  ownerEmail: string;
  status: MemoryCardStatus | string;
  hasPin: boolean;
  isLocked: boolean;
  lockedUntil?: string;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListMyCardsRequest {
  actor: VerifiedActor;
  page?: number;
  limit?: number;
}

export interface ListMyCardsResponse {
  items: MemoryCardSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface GetCardDetailRequest {
  actor: VerifiedActor;
  cardId: string;
}

export interface MemoryCardDetailResponse {
  id: string;
  ringItemId: string;
  ownerCustomerIdentityId: string;
  ownerEmail: string;
  status: MemoryCardStatus | string;
  hasPin: boolean;
  isLocked: boolean;
  pinFailedAttempts: number;
  pinLockedUntil?: string;
  activatedAt?: string;
  arTargetAssetKey?: string;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
}

export interface ActivateCardRequest {
  actor: VerifiedActor;
  cardId: string;
  initialPin?: string;
}

// ---------------------------------------------------------------------------
// PIN Protection
// ---------------------------------------------------------------------------

export interface SetupPinRequest {
  actor: VerifiedActor;
  cardId: string;
  pin: string;
}

export interface SetupPinResponse {
  success: boolean;
  message: string;
  updatedAt: string;
}

export interface ChangePinRequest {
  actor: VerifiedActor;
  cardId: string;
  currentPin: string;
  newPin: string;
}

export interface ChangePinResponse {
  success: boolean;
  message: string;
  updatedAt: string;
}

export interface ResetPinRequest {
  actor: VerifiedActor;
  cardId: string;
  newPin: string;
  verificationCode: string;
}

export interface ResetPinResponse {
  success: boolean;
  message: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Memory Contents & Media Upload
// ---------------------------------------------------------------------------

export interface MemoryContentItem {
  id: string;
  memoryCardId: string;
  contentType: MemoryContentType | string;
  title?: string;
  textContent?: string;
  assetKey?: string;
  assetUrl?: string;
  sortOrder: number;
  status: string;
  layoutJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCardContentsRequest {
  actor: VerifiedActor;
  cardId: string;
  pin?: string;
}

export interface ListCardContentsResponse {
  cardId: string;
  items: MemoryContentItem[];
}

export interface ContentItemInput {
  id?: string;
  contentType: MemoryContentType | string;
  title?: string;
  textContent?: string;
  assetKey?: string;
  sortOrder: number;
  layoutJson?: string;
}

export interface UpdateCardContentsRequest {
  actor: VerifiedActor;
  cardId: string;
  items: ContentItemInput[];
}

export interface UpdateCardContentsResponse {
  success: boolean;
  items: MemoryContentItem[];
}

export interface InitiateMediaUploadRequest {
  actor: VerifiedActor;
  cardId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface InitiateMediaUploadResponse {
  uploadUrl: string;
  assetKey: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Access Grants & Web Session Access
// ---------------------------------------------------------------------------

export interface AccessGrantItem {
  id: string;
  memoryCardId: string;
  granteeEmail: string;
  status: AccessGrantStatus | string;
  inviteExpiresAt?: string;
  acceptedAt?: string;
  lastAccessedAt?: string;
  createdAt: string;
}

export interface CreateAccessGrantRequest {
  actor: VerifiedActor;
  cardId: string;
  granteeEmail: string;
  ttlDays?: number;
}

export interface CreateAccessGrantResponse {
  grantId: string;
  memoryCardId: string;
  granteeEmail: string;
  invitationToken: string;
  inviteUrl: string;
  expiresAt: string;
}

export interface ListAccessGrantsRequest {
  actor: VerifiedActor;
  cardId: string;
}

export interface ListAccessGrantsResponse {
  items: AccessGrantItem[];
}

export interface RevokeAccessGrantRequest {
  actor: VerifiedActor;
  cardId: string;
  grantId: string;
}

export interface RevokeAccessGrantResponse {
  success: boolean;
  message: string;
}

export interface RedeemInvitationRequest {
  invitationToken: string;
  actor?: VerifiedActor;
}

export interface RedeemInvitationResponse {
  accessSessionId: string;
  memoryCardId: string;
  expiresAt: string;
  requiresPin: boolean;
}

export interface GetMemoryBySessionRequest {
  accessSessionId: string;
  pin?: string;
}

export interface GetMemoryBySessionResponse {
  cardId: string;
  status: string;
  items: MemoryContentItem[];
}

// ---------------------------------------------------------------------------
// Service Handlers (Server-side) & Clients (Client-side)
// ---------------------------------------------------------------------------

export interface MemoryServiceHandler {
  listMyCards(request: ListMyCardsRequest): Promise<ListMyCardsResponse>;
  getCardDetail(request: GetCardDetailRequest): Promise<MemoryCardDetailResponse>;
  activateCard(request: ActivateCardRequest): Promise<MemoryCardDetailResponse>;
  setupPin(request: SetupPinRequest): Promise<SetupPinResponse>;
  changePin(request: ChangePinRequest): Promise<ChangePinResponse>;
  resetPin(request: ResetPinRequest): Promise<ResetPinResponse>;
  listCardContents(request: ListCardContentsRequest): Promise<ListCardContentsResponse>;
  updateCardContents(request: UpdateCardContentsRequest): Promise<UpdateCardContentsResponse>;
  initiateMediaUpload(request: InitiateMediaUploadRequest): Promise<InitiateMediaUploadResponse>;
  createAccessGrant(request: CreateAccessGrantRequest): Promise<CreateAccessGrantResponse>;
  listAccessGrants(request: ListAccessGrantsRequest): Promise<ListAccessGrantsResponse>;
  revokeAccessGrant(request: RevokeAccessGrantRequest): Promise<RevokeAccessGrantResponse>;
  redeemInvitation(request: RedeemInvitationRequest): Promise<RedeemInvitationResponse>;
  getMemoryBySession(request: GetMemoryBySessionRequest): Promise<GetMemoryBySessionResponse>;
}

export interface MemoryServiceClient {
  listMyCards(
    request: ListMyCardsRequest,
    metadata?: Metadata,
  ): Observable<ListMyCardsResponse>;
  getCardDetail(
    request: GetCardDetailRequest,
    metadata?: Metadata,
  ): Observable<MemoryCardDetailResponse>;
  activateCard(
    request: ActivateCardRequest,
    metadata?: Metadata,
  ): Observable<MemoryCardDetailResponse>;
  setupPin(
    request: SetupPinRequest,
    metadata?: Metadata,
  ): Observable<SetupPinResponse>;
  changePin(
    request: ChangePinRequest,
    metadata?: Metadata,
  ): Observable<ChangePinResponse>;
  resetPin(
    request: ResetPinRequest,
    metadata?: Metadata,
  ): Observable<ResetPinResponse>;
  listCardContents(
    request: ListCardContentsRequest,
    metadata?: Metadata,
  ): Observable<ListCardContentsResponse>;
  updateCardContents(
    request: UpdateCardContentsRequest,
    metadata?: Metadata,
  ): Observable<UpdateCardContentsResponse>;
  initiateMediaUpload(
    request: InitiateMediaUploadRequest,
    metadata?: Metadata,
  ): Observable<InitiateMediaUploadResponse>;
  createAccessGrant(
    request: CreateAccessGrantRequest,
    metadata?: Metadata,
  ): Observable<CreateAccessGrantResponse>;
  listAccessGrants(
    request: ListAccessGrantsRequest,
    metadata?: Metadata,
  ): Observable<ListAccessGrantsResponse>;
  revokeAccessGrant(
    request: RevokeAccessGrantRequest,
    metadata?: Metadata,
  ): Observable<RevokeAccessGrantResponse>;
  redeemInvitation(
    request: RedeemInvitationRequest,
    metadata?: Metadata,
  ): Observable<RedeemInvitationResponse>;
  getMemoryBySession(
    request: GetMemoryBySessionRequest,
    metadata?: Metadata,
  ): Observable<GetMemoryBySessionResponse>;
}
