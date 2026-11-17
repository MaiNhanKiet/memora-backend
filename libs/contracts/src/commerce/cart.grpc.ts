// Contract gRPC của Commerce Cart (Domain Design), khớp proto/commerce/v1/cart.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export interface GemstoneSelectionItem {
  slotNumber: number;
  gemstoneOptionId: string;
}

export interface CartItemDraft {
  draftId: string;
  templateVariantId: string;
  templateCode: string;
  templateName: string;
  materialName: string;
  standardSize: number;
  targetSize: number;
  personalizationPackage: string;
  memoryEnabled: boolean;
  gemstoneSelections: GemstoneSelectionItem[];
  estimatedPrice: number;
  currency: string;
  estimatedPriceAt: string;
  status: string;
  createdAt: string;
}

export interface GetCartRequest {
  actor: VerifiedActor;
}

export interface GetCartResponse {
  id: string;
  status: string;
  itemsCount: number;
  totalEstimatedPrice: number;
  currency: string;
  expiresAt?: string;
  items: CartItemDraft[];
}

export interface AddCartItemRequest {
  actor: VerifiedActor;
  templateVariantId: string;
  targetSize: number;
  gemstoneSelections: GemstoneSelectionItem[];
  personalizationPackage: string;
  memoryEnabled: boolean;
}

export interface AddCartItemResponse {
  item: CartItemDraft;
  itemsCount: number;
  totalEstimatedPrice: number;
  currency: string;
}

export interface UpdateCartItemRequest {
  actor: VerifiedActor;
  draftId: string;
  targetSize?: number;
  personalizationPackage?: string;
  memoryEnabled?: boolean;
}

export interface UpdateCartItemResponse {
  item: CartItemDraft;
  totalEstimatedPrice: number;
  currency: string;
}

export interface RemoveCartItemRequest {
  actor: VerifiedActor;
  draftId: string;
}

export interface RemoveCartItemResponse {
  removedDraftId: string;
  itemsCount: number;
  totalEstimatedPrice: number;
  currency: string;
}

export interface ValidateCheckoutRequest {
  actor: VerifiedActor;
  selectedDraftIds: string[];
}

export interface CheckoutValidationIssue {
  draftId: string;
  code: string;
  message: string;
}

export interface ValidateCheckoutResponse {
  isValid: boolean;
  totalEstimatedPrice: number;
  currency: string;
  issues: CheckoutValidationIssue[];
}

export interface AbandonCartRequest {
  actor: VerifiedActor;
}

export interface AbandonCartResponse {
  cartId: string;
  status: string;
}

// DESIG-007: Get Design Draft
export interface GetDesignDraftRequest {
  actor: VerifiedActor;
  draftId: string;
}

export interface GetDesignDraftResponse {
  draft: CartItemDraft;
}

// DESIG-008: Duplicate Design Draft
export interface DuplicateDesignDraftRequest {
  actor: VerifiedActor;
  draftId: string;
}

export interface DuplicateDesignDraftResponse {
  draft: CartItemDraft;
  itemsCount: number;
  totalEstimatedPrice: number;
  currency: string;
}

// DESIG-009: Create Design Share Link
export interface CreateDesignShareLinkRequest {
  draftId: string;
  expiresInDays?: number;
  actor: VerifiedActor;
}

export interface CreateDesignShareLinkResponse {
  linkId: string;
  code: string;
  shareUrl: string;
  status: string;
  expiresAt: string;
}

// DESIG-010: Revoke Design Share Link
export interface RevokeDesignShareLinkRequest {
  draftId: string;
  linkId: string;
  actor: VerifiedActor;
}

export interface RevokeDesignShareLinkResponse {
  success: boolean;
  message: string;
}

export interface CartServiceClient {
  getCart(
    request: GetCartRequest,
    metadata?: Metadata,
  ): Observable<GetCartResponse>;
  addCartItem(
    request: AddCartItemRequest,
    metadata?: Metadata,
  ): Observable<AddCartItemResponse>;
  updateCartItem(
    request: UpdateCartItemRequest,
    metadata?: Metadata,
  ): Observable<UpdateCartItemResponse>;
  removeCartItem(
    request: RemoveCartItemRequest,
    metadata?: Metadata,
  ): Observable<RemoveCartItemResponse>;
  validateCheckout(
    request: ValidateCheckoutRequest,
    metadata?: Metadata,
  ): Observable<ValidateCheckoutResponse>;
  abandonCart(
    request: AbandonCartRequest,
    metadata?: Metadata,
  ): Observable<AbandonCartResponse>;
  getDesignDraft(
    request: GetDesignDraftRequest,
    metadata?: Metadata,
  ): Observable<GetDesignDraftResponse>;
  duplicateDesignDraft(
    request: DuplicateDesignDraftRequest,
    metadata?: Metadata,
  ): Observable<DuplicateDesignDraftResponse>;
  createDesignShareLink(
    request: CreateDesignShareLinkRequest,
    metadata?: Metadata,
  ): Observable<CreateDesignShareLinkResponse>;
  revokeDesignShareLink(
    request: RevokeDesignShareLinkRequest,
    metadata?: Metadata,
  ): Observable<RevokeDesignShareLinkResponse>;
}

export interface CartServiceHandler {
  getCart(request: GetCartRequest): Promise<GetCartResponse>;
  addCartItem(request: AddCartItemRequest): Promise<AddCartItemResponse>;
  updateCartItem(
    request: UpdateCartItemRequest,
  ): Promise<UpdateCartItemResponse>;
  removeCartItem(
    request: RemoveCartItemRequest,
  ): Promise<RemoveCartItemResponse>;
  validateCheckout(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse>;
  abandonCart(request: AbandonCartRequest): Promise<AbandonCartResponse>;
  getDesignDraft(
    request: GetDesignDraftRequest,
  ): Promise<GetDesignDraftResponse>;
  duplicateDesignDraft(
    request: DuplicateDesignDraftRequest,
  ): Promise<DuplicateDesignDraftResponse>;
  createDesignShareLink(
    request: CreateDesignShareLinkRequest,
  ): Promise<CreateDesignShareLinkResponse>;
  revokeDesignShareLink(
    request: RevokeDesignShareLinkRequest,
  ): Promise<RevokeDesignShareLinkResponse>;
}
