import type {
  ConfirmFinalQuoteRequest,
  GetOrderFinalConfirmationsRequest,
  GetOrderQuoteByIdRequest,
  ListOrderQuotesRequest,
  RejectFinalQuoteRequest,
  VerifiedActor,
} from '@app/contracts';
import type { ConfirmFinalQuoteBodyDto, RejectFinalQuoteBodyDto } from '../dto';

export function toListOrderQuotesGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): ListOrderQuotesRequest {
  return { actor, orderId };
}

export function toGetOrderQuoteByIdGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  quoteId: string,
): GetOrderQuoteByIdRequest {
  return { actor, orderId, quoteId };
}

export function toConfirmFinalQuoteGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  body?: ConfirmFinalQuoteBodyDto,
): ConfirmFinalQuoteRequest {
  return {
    actor,
    orderId,
    quoteId: body?.quoteId,
    notes: body?.notes,
  };
}

export function toRejectFinalQuoteGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  body: RejectFinalQuoteBodyDto,
  quoteId?: string,
): RejectFinalQuoteRequest {
  return {
    actor,
    orderId,
    quoteId: quoteId ?? body.quoteId,
    reason: body.reason,
  };
}

export function toGetOrderFinalConfirmationsGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): GetOrderFinalConfirmationsRequest {
  return { actor, orderId };
}
