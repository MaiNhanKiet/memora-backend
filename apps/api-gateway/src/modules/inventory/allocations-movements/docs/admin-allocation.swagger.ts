import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { AllocationResponseDto } from '../dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller lacks required role or ownership',
});

export function ApiHoldInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-007] Hold Inventory Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Holds stock lot or certified gemstone with TTL for a ring item.',
    }),
    bearer,
    ApiSuccessResponse({
      type: AllocationResponseDto,
      status: 201,
      description: 'Stock held successfully.',
    }),
    ApiResponse({
      status: 409,
      description: 'Insufficient stock or gemstone not available.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiReserveInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-008] Reserve Inventory Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Confirms reservation after deposit payment, clearing TTL.',
    }),
    bearer,
    ApiParam({
      name: 'allocationId',
      description: 'UUID of the inventory allocation',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: AllocationResponseDto,
      status: 200,
      description: 'Stock reserved successfully.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid allocation status (must be HOLD).',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiAllocateInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-009] Allocate Inventory to Production Attempt',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Binds held/reserved stock to a production attempt.',
    }),
    bearer,
    ApiParam({
      name: 'allocationId',
      description: 'UUID of the inventory allocation',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: AllocationResponseDto,
      status: 200,
      description: 'Stock allocated to production attempt successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiConsumeInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-010] Consume Allocated Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Consumes stock after successful production, deducting on-hand.',
    }),
    bearer,
    ApiParam({
      name: 'allocationId',
      description: 'UUID of the inventory allocation',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: AllocationResponseDto,
      status: 200,
      description: 'Stock consumed successfully and movement ledger updated.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiReleaseInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-011] Release Allocation Back to Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Releases reserved or allocated stock back to available warehouse pool.',
    }),
    bearer,
    ApiParam({
      name: 'allocationId',
      description: 'UUID of the inventory allocation',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: AllocationResponseDto,
      status: 200,
      description: 'Allocation released successfully.',
    }),
    unauthorized,
    forbidden,
  );
}
