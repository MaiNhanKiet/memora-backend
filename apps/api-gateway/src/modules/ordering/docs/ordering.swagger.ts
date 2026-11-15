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
