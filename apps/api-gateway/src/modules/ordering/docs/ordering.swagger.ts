import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import {
  AdminOrderDetailsResponseDto,
  AdminOrderSummaryDto,
  CancelOrderResponseDto,
  ConfirmFinalQuoteResponseDto,
  FinalConfirmationDetailDto,
  FullQuoteDetailDto,
  OrderInvoiceDetailDto,
  PaymentReceiptDetailDto,
  PaymentTransactionDetailDto,
  PaymentTransactionSummaryDto,
  RejectFinalQuoteResponseDto,
  RingItemVersionSummaryDto,
  UpdateCurrentRingItemVersionResponseDto,
  UpdateOrderStatusResponseDto,
} from '../dto/ordering.dto';

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

// ---------------------------------------------------------------------------
// Customer Order Endpoints
// ---------------------------------------------------------------------------

export function ApiCreateOrderDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-001] Create Order from selected ring design drafts',
      description:
        'Converts 1-2 selected drafts into an Order with Ring Items, Version V1 snapshot, and Provisional Quote. ' +
        'Sets initial status to AWAITING_P1 (for FP/SW rings) or PENDING_FINAL_QUOTE (for All-NONE rings). ' +
        'Selected drafts are converted and detached from active cart upon success.',
    }),
    ApiSuccessResponse({
      type: AdminOrderDetailsResponseDto,
      status: 201,
      description: 'Order created successfully with provisional quote',
    }),
    ApiResponse({
      status: 400,
      description:
        'Invalid payload, invalid draft count, or missing Pre-P1 consent for personalized items',
    }),
    unauthorized,
    forbidden('Guest checkout is not permitted for personalized rings'),
    notFound('One or more selected drafts not found or not in cart'),
  );
}

export function ApiListOrdersDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-002] List customer orders',
      description:
        'Returns paginated list of orders owned by the current customer or verified guest.',
    }),
    ApiSuccessResponse({
      type: AdminOrderSummaryDto,
      isArray: true,
      paginated: true,
      description: 'List of orders returned successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid pagination query parameters' }),
    unauthorized,
  );
}

export function ApiGetOrderByIdDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-003] Get Order Details by ID',
      description:
        'Returns complete order details including ring items, pricing, current quote, and active stage.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: AdminOrderDetailsResponseDto,
      description: 'Order details returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}

export function ApiGetOrderTimelineDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-004] Get Order Timeline & Production Stage-Gates',
      description:
        'Returns sequential production milestones (Deposit P1, Sourcing, Design Approval, Milestone P2, Manufacturing, Delivery P3) and historical events.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: AdminOrderDetailsResponseDto,
      description: 'Order timeline and stage gates returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}

export function ApiGetRingItemDetailsDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-006] Get Ring Item Details in Order',
      description:
        'Returns specifications, gemstone slot assignments, target size, and current design version of a specific ring item.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'itemId', description: 'Ring Item UUID', type: String }),
    ApiSuccessResponse({
      type: RingItemVersionSummaryDto,
      description: 'Ring item details returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order item'),
    notFound('Order or ring item'),
  );
}

export function ApiListRingItemVersionsDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-010] List Design Iteration Versions for a Ring Item',
      description:
        'Returns version history (V1, V2, V3...) showing 3D model status, CAD render keys, and customer approval history.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'ringItemId', description: 'Ring Item UUID', type: String }),
    ApiSuccessResponse({
      type: RingItemVersionSummaryDto,
      isArray: true,
      description: 'List of ring item versions returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order item'),
    notFound('Order or ring item'),
  );
}

export function ApiUpdateCurrentRingItemVersionDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-010 Update] Customer updates current version draft specs',
      description:
        'Allows customer to adjust target size, engraving notes, or slot configurations while current version is in DRAFT.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'ringItemId', description: 'Ring Item UUID', type: String }),
    ApiSuccessResponse({
      type: UpdateCurrentRingItemVersionResponseDto,
      description: 'Version updated successfully',
    }),
    ApiResponse({ status: 400, description: 'Version is locked or already approved' }),
    unauthorized,
    forbidden('Caller does not own this order item'),
    notFound('Current version draft not found'),
  );
}

export function ApiListOrderQuotesDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-003 Sub] List Quotes associated with Order',
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

export function ApiCancelOrderDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-005] Customer cancels order',
      description:
        'Cancels order if in cancellable status (AWAITING_P1, PENDING_FINAL_QUOTE, AWAITING_CUSTOMER_CONFIRMATION) and releases inventory allocations.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: CancelOrderResponseDto,
      description: 'Order cancelled successfully and allocations released',
    }),
    ApiResponse({
      status: 400,
      description: 'Order cannot be cancelled in current status (e.g. already manufacturing)',
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
      summary: '[ORDER-011 View] Get specific quote details',
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
        'Customer accepts the ISSUED final quote, snapshots confirmed items, and advances order to AWAITING_P2.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: ConfirmFinalQuoteResponseDto,
      description: 'Final quote confirmed successfully',
    }),
    ApiResponse({ status: 400, description: 'Quote is not in ISSUED status or has expired' }),
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
      summary: '[ORDER-015] Customer rejects Final Quote',
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
    ApiParam({ name: 'transactionId', description: 'Transaction UUID', type: String }),
    ApiSuccessResponse({
      type: PaymentTransactionDetailDto,
      description: 'Payment transaction details returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order transaction'),
    notFound('Payment transaction or order'),
  );
}

export function ApiGetPaymentReceiptDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-021] Get Immutable Payment Receipt',
      description:
        'Retrieves official electronic payment receipt with immutable receipt_no for a completed payment.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'transactionId', description: 'Transaction UUID', type: String }),
    ApiSuccessResponse({
      type: PaymentReceiptDetailDto,
      description: 'Payment receipt returned successfully',
    }),
    ApiResponse({ status: 400, description: 'Receipt is only available for SUCCEEDED transactions' }),
    unauthorized,
    forbidden('Caller does not own this receipt'),
    notFound('Payment transaction or order'),
  );
}

export function ApiGetOrderInvoiceDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-022] Get Order Invoice / Summary',
      description:
        'Retrieves comprehensive order invoice breakdown with invoice_no, total, totalPaid, remaining, and items.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: OrderInvoiceDetailDto,
      description: 'Order invoice returned successfully',
    }),
    unauthorized,
    forbidden('Caller does not own this order invoice'),
    notFound('Order'),
  );
}

// ---------------------------------------------------------------------------
// Admin / Staff Order Endpoints
// ---------------------------------------------------------------------------

export function ApiListAdminOrdersDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-007] List Orders for Administration',
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
      summary: '[ORDER-008] Get Admin Order Details',
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
      summary: '[ORDER-009] Update Order Production Status',
      description:
        'Requires roles: `STORE_MANAGER`, `STORE_STAFF`, `SUPER_ADMIN`, `ADMIN`, `MANAGER`. Validates state transition machine.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: UpdateOrderStatusResponseDto,
      description: 'Order status updated successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid state machine transition' }),
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
        'Allows staff to create a DRAFT final quote with exact prices, components, and validity date for an order in PENDING_FINAL_QUOTE.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      status: 201,
      description: 'Final quote draft created successfully',
    }),
    ApiResponse({ status: 400, description: 'Line items cannot be empty or invalid amounts' }),
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
    ApiResponse({ status: 400, description: 'Only DRAFT quotes can be edited' }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Quote or order'),
  );
}

export function ApiPublishFinalQuoteDocs() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-013] Publish Final Quote to Customer (Staff)',
      description:
        'Transitions quote status from DRAFT to ISSUED, locks items, and advances order to AWAITING_CUSTOMER_CONFIRMATION.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({ name: 'quoteId', description: 'Quote UUID', type: String }),
    ApiSuccessResponse({
      type: FullQuoteDetailDto,
      description: 'Final quote published to customer successfully',
    }),
    ApiResponse({ status: 400, description: 'Quote is not in DRAFT status' }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Quote or order'),
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
    ApiParam({ name: 'transactionId', description: 'Transaction UUID', type: String }),
    ApiSuccessResponse({
      type: PaymentTransactionDetailDto,
      status: 201,
      description: 'Refund request created successfully with PENDING status',
    }),
    ApiResponse({ status: 400, description: 'Invalid refund amount or missing reason' }),
    unauthorized,
    forbidden('Caller lacks staff/admin role'),
    notFound('Original payment transaction'),
  );
}
