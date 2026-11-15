import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

export function ApiCreateOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-001] Create Order from selected ring design drafts',
      description:
        'Converts 1-2 selected drafts into an Order with Ring Items, Version V1 snapshot, and Provisional Quote. ' +
        'Sets initial status to AWAITING_P1 (for FP/SW rings) or PENDING_FINAL_QUOTE (for All-NONE rings). ' +
        'Selected drafts are converted and detached from active cart upon success.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID (only permitted for All-NONE orders)',
      required: false,
    }),
    ApiCreatedResponse({
      description: 'Order created successfully with provisional quote',
    }),
    ApiBadRequestResponse({
      description:
        'Invalid payload, invalid draft count, or missing Pre-P1 consent for personalized items',
    }),
    ApiForbiddenResponse({
      description: 'Guest checkout is not permitted for personalized rings',
    }),
    ApiNotFoundResponse({
      description: 'One or more selected drafts not found or not in cart',
    }),
  );
}

export function ApiListOrdersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-002] List customer orders',
      description:
        'Returns paginated list of orders owned by the current customer or verified guest.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({ description: 'List of orders returned successfully' }),
  );
}

export function ApiGetOrderByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-003] Get Order details and tracking info',
      description:
        'Retrieves order status, recipient info, current provisional/final quote, and ring items.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({ description: 'Order details returned successfully' }),
    ApiNotFoundResponse({
      description: 'Order not found or not owned by actor',
    }),
  );
}

export function ApiGetOrderTimelineDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-004] Get Order status timeline & stage gates',
      description:
        'Returns chronologically ordered events and stage gate progress (Deposit P1, Sourcing, Final Quote, Production, Delivery).',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Order timeline and stage gates returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or not owned by actor',
    }),
  );
}

export function ApiGetRingItemDetailsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-007] Get Ring Item details and configuration in order',
      description:
        'Retrieves detailed specifications of a ring item inside an order, including size, metal, package, and gemstone placements.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({ description: 'Ring item details returned successfully' }),
    ApiNotFoundResponse({
      description: 'Ring item or order not found or not owned by actor',
    }),
  );
}

export function ApiListAdminOrdersDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-006] Admin: List all orders with filters',
      description:
        'Returns paginated list of system-wide orders with status, date range, and keyword search filters. Requires ORDER_READ_OPERATIONS permission.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({ description: 'Admin orders list returned successfully' }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions (requires ORDER_READ_OPERATIONS)',
    }),
  );
}

export function ApiGetAdminOrderDetailsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-ADMIN-01] Admin: Get full order details',
      description:
        'Retrieves comprehensive order details for staff/manager, including customer identity, ring items, quotes, and pre-P1 evidence.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Admin order details returned successfully',
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions (requires ORDER_READ_OPERATIONS)',
    }),
    ApiNotFoundResponse({ description: 'Order not found' }),
  );
}

export function ApiUpdateOrderStatusDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-ADMIN-02] Admin: Update order status transition',
      description:
        'Transitions order to a valid next lifecycle status or CANCELLED with reason. Requires ORDER_READ_OPERATIONS permission.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Order status transitioned successfully',
    }),
    ApiBadRequestResponse({
      description: 'Invalid status transition according to state machine rules',
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions (requires ORDER_READ_OPERATIONS)',
    }),
    ApiNotFoundResponse({ description: 'Order not found' }),
  );
}

export function ApiListRingItemVersionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-008] List all versions of a ring item in order',
      description:
        'Retrieves the chronological history of configuration versions for a ring item. Available to the order owner.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Ring item versions returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order or ring item not found or not owned by actor',
    }),
  );
}

export function ApiUpdateCurrentRingItemVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-009] Update current draft design version of ring item',
      description:
        'Allows adjusting size, reason, or memory flag while the ring item version is in DRAFT or SUBMITTED status.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Current ring item version updated successfully',
    }),
    ApiBadRequestResponse({
      description: 'Cannot update locked or manufacturing version',
    }),
    ApiNotFoundResponse({
      description: 'Ring item or current version not found',
    }),
  );
}

export function ApiListOrderQuotesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-010] List all quotes of an order',
      description:
        'Retrieves list of provisional and final quotes with detailed itemized cost breakdowns.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Order quotes returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or not owned by actor',
    }),
  );
}

export function ApiCancelOrderDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-005] Cancel Order (Pre-production)',
      description:
        'Allows customer or staff to cancel an order prior to production authorization (status must be AWAITING_P1, PENDING_FINAL_QUOTE, or AWAITING_CUSTOMER_CONFIRMATION). Releases all active inventory allocations.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Order successfully cancelled and allocations released',
    }),
    ApiBadRequestResponse({
      description: 'Order is not in a cancellable status',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or not owned by actor',
    }),
  );
}

export function ApiCreateFinalQuoteDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-011] Create Final Quote for Order (Staff / Manager)',
      description:
        'Allows staff to generate a formal Final Quote (quote_type = FINAL, status = DRAFT) with itemized cost components (gold weight, stone costs, custom labor).',
    }),
    ApiBearerAuth(),
    ApiCreatedResponse({
      description: 'Final quote draft created successfully',
    }),
    ApiBadRequestResponse({
      description: 'Invalid quote line items or amounts',
    }),
    ApiNotFoundResponse({
      description: 'Order not found',
    }),
  );
}

export function ApiUpdateFinalQuoteDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-012] Update Draft Final Quote (Staff / Manager)',
      description:
        'Allows staff to modify line items, discounts, delivery fees, or valid date while the quote is still in DRAFT status.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Final quote updated successfully',
    }),
    ApiBadRequestResponse({
      description: 'Quote cannot be edited because it is not in DRAFT status',
    }),
    ApiNotFoundResponse({
      description: 'Quote not found for order',
    }),
  );
}

export function ApiPublishFinalQuoteDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-013] Publish Final Quote to Customer (Staff / Manager)',
      description:
        'Publishes the final quote: status transitions to ISSUED, valid_until is set (default +7 days), order current_quote_id is updated, and order status transitions to AWAITING_CUSTOMER_CONFIRMATION.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Quote published successfully and order ready for confirmation',
    }),
    ApiBadRequestResponse({
      description: 'Quote is not in DRAFT status',
    }),
    ApiNotFoundResponse({
      description: 'Quote not found for order',
    }),
  );
}

export function ApiGetOrderQuoteByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-013 Part B] Get specific Quote details',
      description:
        'Retrieves comprehensive breakdown of a single quote (provisional or final) including all line items and validity dates.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Quote details retrieved successfully',
    }),
    ApiNotFoundResponse({
      description: 'Quote or order not found',
    }),
  );
}

export function ApiConfirmFinalQuoteDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-014] Confirm Final Quote and Ring Item Versions (Customer)',
      description:
        'Customer accepts the ISSUED final quote and locks all ring item versions. Creates an immutable record in final_confirmations and final_confirmation_items. Order advances to AWAITING_P2 (or PRODUCTION_AUTHORIZED if All-NONE).',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Final quote and versions successfully confirmed',
    }),
    ApiBadRequestResponse({
      description: 'Quote is expired or not in ISSUED status',
    }),
    ApiNotFoundResponse({
      description: 'Order or quote not found',
    }),
  );
}

export function ApiRejectFinalQuoteDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-015 Part B] Reject Final Quote (Customer)',
      description:
        'Customer rejects the current ISSUED final quote with a reason. Quote status changes to REJECTED, and order reverts to PENDING_FINAL_QUOTE for staff revision.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Quote rejected successfully',
    }),
    ApiBadRequestResponse({
      description: 'Quote is not in ISSUED status or rejection reason is empty',
    }),
    ApiNotFoundResponse({
      description: 'Order or quote not found',
    }),
  );
}

export function ApiGetOrderFinalConfirmationsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-015 Part A] Get Order Final Confirmations History',
      description:
        'Retrieves confirmation records and locked version snapshots for the order.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Confirmations history retrieved successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order not found',
    }),
  );
}

export function ApiListOrderPaymentsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-017] List all payments of an order',
      description:
        'Retrieves list of payment attempts, stages (P1/P2/P3), amounts, and total amount paid for the order.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'List of order payments returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or not owned by actor',
    }),
  );
}

export function ApiGetOrderPaymentByIdDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-018] Get Payment Transaction by ID',
      description:
        'Retrieves full details of a payment transaction (provider info, timing, status, failure reasons).',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Payment transaction details returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Payment transaction or order not found',
    }),
  );
}

export function ApiGetPaymentReceiptDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-021] Get Immutable Payment Receipt',
      description:
        'Retrieves official electronic payment receipt with immutable receipt_no for a completed payment.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Payment receipt returned successfully',
    }),
    ApiBadRequestResponse({
      description: 'Receipt is only available for SUCCEEDED transactions',
    }),
    ApiNotFoundResponse({
      description: 'Payment transaction or order not found',
    }),
  );
}

export function ApiGetOrderInvoiceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-022] Get Order Invoice / Summary',
      description:
        'Retrieves comprehensive order invoice breakdown with invoice_no, total, totalPaid, remaining, and items.',
    }),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-guest-session-id',
      description: 'Guest session UUID',
      required: false,
    }),
    ApiOkResponse({
      description: 'Order invoice returned successfully',
    }),
    ApiNotFoundResponse({
      description: 'Order not found or invoice unavailable',
    }),
  );
}

export function ApiCreateRefundRequestDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[ORDER-023] Create Refund Request (Staff / Admin)',
      description:
        'Allows staff to create an audited refund request linked to an existing successful transaction.',
    }),
    ApiBearerAuth(),
    ApiCreatedResponse({
      description: 'Refund request created successfully with PENDING status',
    }),
    ApiBadRequestResponse({
      description: 'Invalid refund amount or missing reason',
    }),
    ApiNotFoundResponse({
      description: 'Original payment transaction not found',
    }),
  );
}
