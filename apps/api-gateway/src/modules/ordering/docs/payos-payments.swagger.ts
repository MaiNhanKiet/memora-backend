import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import {
  PaymentLinkResponseDto,
  PayosWebhookResponseDto,
} from '../dto/payos-payments.dto';
import { PaymentTransactionDetailDto } from '../dto/ordering.dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller lacks required role or ownership',
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
    forbidden,
    notFound('Order'),
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
      description: 'Transaction missing provider_order_code',
    }),
    unauthorized,
    forbidden,
    notFound('Transaction'),
  );
}

export function ApiCreateClaimPaymentLink() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-026] Create PayOS payment link for claim service quote',
      description:
        'Generates PayOS VietQR payment link for the accepted service quote on a post-purchase claim.',
    }),
    ApiParam({
      name: 'claimId',
      description: 'Claim UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentLinkResponseDto,
      status: 201,
      description: 'Payment link created successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'No ACCEPTED service quote found for this claim',
    }),
    unauthorized,
    forbidden,
    notFound('Claim or quote'),
  );
}
