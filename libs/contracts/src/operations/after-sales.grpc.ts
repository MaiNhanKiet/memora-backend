import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type { VerifiedActor } from '../common/actor';

export const AFTER_SALES_PACKAGE = 'memora.after_sales.v1';
export const AFTER_SALES_CLAIMS_SERVICE_NAME = 'AfterSalesClaimsService';

export enum ClaimQuoteAction {
  UNSPECIFIED = 0,
  VIEW_QUOTE = 1,
  ACCEPT_QUOTE = 2,
  PAY_QUOTE = 3,
}

export interface AuthorizeClaimQuoteAccessRequest {
  readonly actor: VerifiedActor;
  readonly claimId: string;
  readonly action: ClaimQuoteAction;
}

export interface AuthorizeClaimQuoteAccessResponse {
  readonly allowed: boolean;
}

export interface GetReturnReceiptForRefundRequest {
  readonly claimId: string;
}

export type GetReturnReceiptForRefundResponse =
  | { readonly eligible: false }
  | {
      readonly eligible: true;
      readonly orderId: string;
      readonly ringItemId: string;
      readonly receiptId: string;
    };

export interface AfterSalesClaimsServiceClient {
  authorizeClaimQuoteAccess(
    request: AuthorizeClaimQuoteAccessRequest,
    metadata?: Metadata,
  ): Observable<AuthorizeClaimQuoteAccessResponse>;
  getReturnReceiptForRefund(
    request: GetReturnReceiptForRefundRequest,
    metadata?: Metadata,
  ): Observable<GetReturnReceiptForRefundResponse>;
}
