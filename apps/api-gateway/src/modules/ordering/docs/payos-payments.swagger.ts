import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  PaymentLinkResponseDto,
  PayosWebhookResponseDto,
} from '../dto/payos-payments.dto';

export function ApiCreateOrderPaymentLink() {
  return applyDecorators(
    ApiTags('orders'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 201,
      description: 'PayOS payment link created successfully',
      type: PaymentLinkResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid order state or amount calculation error',
    }),
    ApiResponse({
      status: 404,
      description: 'Order not found',
    }),
  );
}

export function ApiProcessPayosWebhook() {
  return applyDecorators(
    ApiTags('payments'),
    ApiOperation({
      summary: '[ORDER-019] Receive PayOS IPN webhook',
      description:
        'Webhook endpoint called by PayOS server upon successful payment. Verifies checksum HMAC-SHA256, marks transaction as SUCCEEDED and advances order stage.',
    }),
    ApiResponse({
      status: 200,
      description: 'Webhook processed successfully',
      type: PayosWebhookResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Invalid webhook signature',
    }),
  );
}

export function ApiReconcilePaymentTransaction() {
  return applyDecorators(
    ApiTags('admin-payments'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 200,
      description: 'Reconciled transaction detail',
    }),
  );
}

export function ApiCreateClaimPaymentLink() {
  return applyDecorators(
    ApiTags('Claims'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 201,
      description: 'Payment link created successfully',
      type: PaymentLinkResponseDto,
    }),
  );
}
