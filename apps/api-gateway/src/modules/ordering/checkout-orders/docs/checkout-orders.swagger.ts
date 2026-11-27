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
  AdminOrderDetailsResponseDto,
  AdminOrderSummaryDto,
  CancelOrderResponseDto,
  OrderDetailsResponseDto,
  RingItemDetailResponseDto,
  RingItemVersionSummaryDto,
  UpdateCurrentRingItemVersionResponseDto,
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
    ApiResponse({
      status: 400,
      description: 'Invalid pagination query parameters',
    }),
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
      type: OrderDetailsResponseDto,
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
      summary: '[ORDER-007] Get Ring Item Details in Order',
      description:
        'Returns specifications, gemstone slot assignments, target size, and current design version of a specific ring item.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({
      name: 'ringItemId',
      description: 'Ring Item UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: RingItemDetailResponseDto,
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
      summary: '[ORDER-008] List Design Iteration Versions for a Ring Item',
      description:
        'Returns version history (V1, V2, V3...) showing 3D model status, CAD render keys, and customer approval history.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({
      name: 'ringItemId',
      description: 'Ring Item UUID',
      type: String,
    }),
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
      summary: '[ORDER-009] Customer updates current version draft specs',
      description:
        'Allows customer to adjust target size, engraving notes, or slot configurations while current version is in DRAFT.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiParam({
      name: 'ringItemId',
      description: 'Ring Item UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: UpdateCurrentRingItemVersionResponseDto,
      description: 'Version updated successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Version is locked or already approved',
    }),
    unauthorized,
    forbidden('Caller does not own this order item'),
    notFound('Current version draft not found'),
  );
}

export function ApiCancelOrderDocs() {
  return applyDecorators(
    bearer,
    guestSessionHeader,
    ApiOperation({
      summary: '[ORDER-005] Customer cancels order',
      description:
        'Cancels order if in cancellable status (AWAITING_P1, PENDING_FINAL_QUOTE, AWAITING_FINAL_CONFIRMATION) and releases inventory allocations.',
    }),
    ApiParam({ name: 'orderId', description: 'Order UUID', type: String }),
    ApiSuccessResponse({
      type: CancelOrderResponseDto,
      description: 'Order cancelled successfully and allocations released',
    }),
    ApiResponse({
      status: 400,
      description:
        'Order cannot be cancelled in current status (e.g. already manufacturing)',
    }),
    unauthorized,
    forbidden('Caller does not own this order'),
    notFound('Order'),
  );
}
