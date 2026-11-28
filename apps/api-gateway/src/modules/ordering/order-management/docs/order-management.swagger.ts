import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  AdminOrderDetailsResponseDto,
  AdminOrderSummaryDto,
} from '../../checkout-orders/dto';
import { FullQuoteDetailDto } from '../../quotes/dto/quote-response.dto';
import { UpdateOrderStatusResponseDto } from '../dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = (reason?: string) =>
  ApiResponse({
    status: 403,
    description: reason ?? 'Caller lacks staff/admin role',
  });
const notFound = (resource: string) =>
  ApiResponse({
    status: 404,
    description: `${resource} not found`,
  });

export function ApiListAdminOrdersDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-006] List Orders for Administration',
      description:
        'Requires roles: `STORE_MANAGER`, `STORE_STAFF`, `SUPER_ADMIN`, `ADMIN`, `MANAGER`. Supports filters by status, dates, search, and pagination.',
    }),
    ApiSuccessResponse({
      type: AdminOrderSummaryDto,
      isArray: true,
      paginated: true,
      description: 'Admin order list returned successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid query filters' }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
  );
}

export function ApiGetAdminOrderDetailsDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-ADMIN-01] Get Admin Order Details',
      description:
        'Requires roles: `STORE_MANAGER`, `STORE_STAFF`, `SUPER_ADMIN`, `ADMIN`, `MANAGER`. Returns complete operational details, customer identity info, and payment records.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: AdminOrderDetailsResponseDto,
      description: 'Admin order details returned successfully',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Order'),
  );
}

export function ApiUpdateOrderStatusDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-ADMIN-02] Update Order Production Status',
      description:
        'Requires roles: `STORE_MANAGER`, `STORE_STAFF`, `SUPER_ADMIN`, `ADMIN`, `MANAGER`. Validates state transition machine.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: UpdateOrderStatusResponseDto,
      description: 'Order status updated successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid state machine transition',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Order'),
  );
}

export function ApiCreateFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-011] Create Final Quote Draft (Staff)',
      description:
        'For All-NONE orders, the order must be in PENDING_FINAL_QUOTE and every current ring item version must be REVIEW_NOT_REQUIRED.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      status: 201,
      description: 'Final quote draft created successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Line items are missing, invalid, or refer to another order',
    }),
    ApiResponse({
      status: 409,
      description:
        'The All-NONE order or its ring versions are not ready for a final quote',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Order'),
  );
}

export function ApiUpdateFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-012] Update Final Quote Draft (Staff)',
      description:
        'Allows staff to modify line items and amounts of a DRAFT quote before publishing.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'quoteId', description: 'Quote UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      description: 'Final quote updated successfully',
    }),
    ApiResponse({
      status: 400,
      description:
        'Quote is not a DRAFT final quote or a line item refers to another order',
    }),
    ApiResponse({
      status: 409,
      description:
        'The quote is stale or the All-NONE order or its ring versions are not ready',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Quote or order'),
  );
}

export function ApiPublishFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-013 Part A] Publish Final Quote to Customer (Staff)',
      description:
        'Transitions quote status from DRAFT to ISSUED, and advances order to AWAITING_FINAL_CONFIRMATION.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'quoteId', description: 'Quote UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      description: 'Final quote published to customer successfully',
    }),
    ApiResponse({ status: 400, description: 'Quote is not in DRAFT status' }),
    ApiResponse({
      status: 409,
      description:
        'The quote is stale or the All-NONE order or its ring versions are not ready',
    }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Quote or order'),
  );
}
