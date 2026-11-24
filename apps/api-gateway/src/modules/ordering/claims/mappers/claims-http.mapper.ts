import type {
  AcceptServiceQuoteRequest,
  CreateClaimPaymentLinkRequest,
  ListClaimQuotesRequest,
  VerifiedActor,
} from '@app/contracts';
import type { CreateClaimPaymentLinkBodyDto } from '../dto';

export function toListClaimQuotesGrpcRequest(
  claimId: string,
  actor: VerifiedActor,
): ListClaimQuotesRequest {
  return { claimId, actor };
}

export function toAcceptServiceQuoteGrpcRequest(
  claimId: string,
  quoteId: string,
  actor: VerifiedActor,
): AcceptServiceQuoteRequest {
  return { claimId, quoteId, actor };
}

export function toCreateClaimPaymentLinkGrpcRequest(
  claimId: string,
  body: CreateClaimPaymentLinkBodyDto,
  actor: VerifiedActor,
): CreateClaimPaymentLinkRequest {
  return {
    claimId,
    returnUrl: body.returnUrl,
    cancelUrl: body.cancelUrl,
    actor,
  };
}
