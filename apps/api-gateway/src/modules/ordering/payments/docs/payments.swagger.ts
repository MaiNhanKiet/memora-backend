import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  PaymentLinkResponseDto,
  PaymentTransactionDetailDto,
  PaymentTransactionSummaryDto,
  PayosWebhookResponseDto,
} from '../dto';

const bearer = ApiBearerAuth('bearer');
const guestSessionHeader = ApiHeader({
  name: 'x-guest-session-id',
  description: 'Anonymous guest session UUID',
  required: false,
});
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = (reason?: string) =>
  ApiResponse({
    status: 403,
    description: reason ?? 'Caller lacks required role or ownership',
  });
const notFound = (resource: string) =>
  ApiResponse({
    status: 404,
    description: `${resource} not found`,
  });

export function ApiCreateOrderPaymentLink() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-016] Create PayOS payment link for an order (P1/P2/P3)',
      description:
        'Generates dynamic VietQR and PayOS hosted checkout URL for the order deposit stages (P1: 30%, P2: 40%, P3: 30% or 100% for all-NONE).',
    }),
    ApiParam({
      name: 'orderId',
      description: 'Order UUID',
      type: String,
      example: 'a1b81e4b-70c1-4ebc-b391-4770ff902222',
    }),
    ApiSuccessResponse({
      type: PaymentLinkResponseDto,
      status: 201,
      description: 'PayOS payment link created successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid order state or amount calculation error',
    }),
    unauthorized,
    forbidden('Caller lacks required role or ownership'),
    notFound('Order'),
  );
}

export function ApiListOrderPaymentsDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-017] List Order Payment Transactions',
      description:
        'Returns all payment transactions, stages (P1/P2/P3/REFUND), statuses, and calculated total paid amount.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: PaymentTransactionSummaryDto,
      isArray: true,
      description: 'Payment transactions returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}

export function ApiGetOrderPaymentByIdDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-018] Get Payment Transaction Attempt Details',
      description:
        'Retrieves single payment transaction detail with PayOS provider status, references, and timestamps.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({
      name: 'transactionId',
      description: 'Transaction UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentTransactionDetailDto,
      description: 'Payment transaction details returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order transaction'),
    notFound('Transaction or order'),
  );
}

export function ApiCreateRefundRequestDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-023] Create Refund Request (Staff / Admin)',
      description:
        'Allows staff to create an audited refund request linked to an existing successful transaction.',
    }),
    ApiParam({
      name: 'transactionId',
      description: 'Transaction UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentTransactionDetailDto,
      status: 201,
      description: 'Refund request created successfully with PENDING status',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid refund amount or missing reason',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Original payment transaction'),
  );
}

export function ApiReconcilePaymentTransaction() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-020] Actively reconcile payment status with PayOS',
      description:
        'Queries PayOS API for transaction status and syncs database if payment was completed but webhook missed.',
    }),
    ApiParam({
      name: 'transactionId',
      description: 'Payment transaction UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentTransactionDetailDto,
      status: 200,
      description: 'Reconciled transaction detail',
    }),
    ApiResponse({
      status: 400,
      description: 'Failed to reconcile payment with PayOS',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Transaction'),
  );
}

export function ApiProcessPayosWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-019] Receive PayOS IPN webhook',
      description:
        'Webhook endpoint called by PayOS server upon successful payment. Verifies checksum HMAC-SHA256, marks transaction as SUCCEEDED and advances order stage.',
    }),
    ApiSuccessResponse({
      type: PayosWebhookResponseDto,
      status: 200,
      description: 'Webhook processed successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid payload or JSON body',
    }),
    ApiResponse({
      status: 403,
      description: 'Invalid webhook signature',
    }),
  );
}

export function ApiPaymentSseStreamDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiProduces('text/event-stream'),
    ApiOperation({
      summary: '[ORDER-019-SSE] Realtime Server-Sent Events (SSE) payment stream',
      description:
        'Opens an HTTP text/event-stream connection to listen for real-time payment status updates. Emits "connected", "ping" (heartbeat every 25s), and "payment.succeeded" immediately when PayOS webhook is processed.',
    }),
    ApiParam({
      name: 'orderId',
      description: 'Order UUID',
      type: String,
      example: 'a1b81e4b-70c1-4ebc-b391-4770ff902222',
    }),
    ApiResponse({
      status: 200,
      description: 'SSE stream connection established (Content-Type: text/event-stream)',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}
