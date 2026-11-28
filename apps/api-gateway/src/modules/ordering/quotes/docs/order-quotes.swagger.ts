import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  ConfirmFinalQuoteResponseDto,
  FinalConfirmationDetailDto,
  FullQuoteDetailDto,
  RejectFinalQuoteResponseDto,
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

export function ApiListOrderQuotesDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-010] List Quotes associated with Order',
      description:
        'Returns provisional quote and any subsequent final quotes with price version references.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      isArray: true,
      description: 'List of quotes returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}

export function ApiGetOrderQuoteByIdDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-013 Part B] Get specific quote details',
      description:
        'Retrieves quote line items, adjustments, delivery amount, and total breakdown.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'quoteId', description: 'Quote UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      description: 'Quote details returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Quote or order'),
  );
}

export function ApiConfirmFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-014] Customer confirms Final Quote',
      description:
        'The customer accepts the active ISSUED final quote. All-NONE orders confirm the quoted versions and skip P2. Orders with personalization advance to AWAITING_P2.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: ConfirmFinalQuoteResponseDto,
      description: 'Final quote confirmed successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Quote is not in ISSUED status or has expired',
    }),
    ApiResponse({
      status: 409,
      description:
        'The final quote is stale, no longer active, or has ring versions that are not ready',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Quote or order'),
  );
}

export function ApiRejectFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-015 Part B] Customer rejects Final Quote',
      description:
        'Customer rejects the final quote with a mandatory reason, reverting order to PENDING_FINAL_QUOTE.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: RejectFinalQuoteResponseDto,
      description: 'Final quote rejected and order reverted for revision',
    }),
    ApiResponse({ status: 400, description: 'Rejection reason is required' }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Quote or order'),
  );
}

export function ApiGetOrderFinalConfirmationsDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-015 Part A] List Final Confirmations for Order',
      description:
        'Returns immutable confirmation audit records showing exactly what customer approved.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: FinalConfirmationDetailDto,
      isArray: true,
      description: 'Confirmations list returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}
