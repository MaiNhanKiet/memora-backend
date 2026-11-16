import type {
  GetOrderInvoiceRequest,
  GetPaymentReceiptRequest,
  VerifiedActor,
} from '@app/contracts';

export function toGetPaymentReceiptGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  transactionId: string,
): GetPaymentReceiptRequest {
  return { actor, orderId, transactionId };
}

export function toGetOrderInvoiceGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): GetOrderInvoiceRequest {
  return { actor, orderId };
}
