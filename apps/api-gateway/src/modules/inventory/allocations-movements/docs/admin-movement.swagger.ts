import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  InventoryMovementListResponseDto,
  InventoryMovementResponseDto,
} from '../dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller lacks required role or ownership',
});

export function ApiListInventoryMovementsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-012] List Inventory Movement Ledger',
      description:
        'Requires INVENTORY_VIEW permission / MANAGER role. Returns immutable audit ledger of all inventory transactions and state transitions.',
    }),
    bearer,
    ApiSuccessResponse({
      type: InventoryMovementListResponseDto,
      status: 200,
      description: 'Audit ledger of inventory movements retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiAdjustInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-013] Adjust Stock Lot Quantity',
      description:
        'Requires INVENTORY_ADJUST permission / ADMIN role. Manual stock correction (spoilage, shrinkage, audit discrepancy) with mandatory reason.',
    }),
    bearer,
    ApiSuccessResponse({
      type: InventoryMovementResponseDto,
      status: 200,
      description: 'Stock adjusted and ADJUSTMENT ledger entry created.',
    }),
    ApiResponse({
      status: 400,
      description: 'Adjustment would result in negative quantity on hand.',
    }),
    ApiResponse({
      status: 404,
      description: 'Target stock lot not found.',
    }),
    unauthorized,
    forbidden,
  );
}
