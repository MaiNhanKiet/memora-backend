import type {
  CreateOrderPaymentLinkRequest,
  CreateRefundRequestMessage,
  GetOrderPaymentByIdRequest,
  ListOrderPaymentsRequest,
  PayosWebhookRequest,
  ReconcilePaymentTransactionRequest,
  VerifiedActor,
} from '@app/contracts';
import type {
  CreateOrderPaymentLinkBodyDto,
  CreateRefundRequestBodyDto,
  PayosWebhookBodyDto,
} from '../dto';

export function toCreateOrderPaymentLinkGrpcRequest(
  orderId: string,
  body: CreateOrderPaymentLinkBodyDto,
  actor: VerifiedActor,
): CreateOrderPaymentLinkRequest {
  return {
    orderId,
    paymentStage: body.paymentStage,
    returnUrl: body.returnUrl,
    cancelUrl: body.cancelUrl,
    actor,
  };
}

export function toListOrderPaymentsGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
): ListOrderPaymentsRequest {
  return { actor, orderId };
}

export function toGetOrderPaymentByIdGrpcRequest(
  actor: VerifiedActor,
  orderId: string,
  transactionId: string,
): GetOrderPaymentByIdRequest {
  return { actor, orderId, transactionId };
}

export function toCreateRefundRequestGrpcRequest(
  transactionId: string,
  body: CreateRefundRequestBodyDto,
  actor: VerifiedActor,
): CreateRefundRequestMessage {
  return {
    transactionId,
    refundAmount: body.refundAmount,
    reason: body.reason,
    notes: body.notes,
    claimId: body.claimId,
    actor,
  };
}

export function toReconcilePaymentTransactionGrpcRequest(
  transactionId: string,
  actor: VerifiedActor,
): ReconcilePaymentTransactionRequest {
  return {
    transactionId,
    actor,
  };
}

export function toProcessPayosWebhookGrpcRequest(
  body: PayosWebhookBodyDto,
): PayosWebhookRequest {
  const dataJson =
    typeof body.data === 'string'
      ? body.data
      : body.data !== undefined
        ? JSON.stringify(body.data)
        : '{}';
  return {
    code: body.code ?? '00',
    desc: body.desc ?? '',
    success: body.success ?? true,
    dataJson,
    signature: body.signature ?? '',
  };
}
