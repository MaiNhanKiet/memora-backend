import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CertifiedGemstoneListResponseDto,
  CertifiedGemstoneResponseDto,
  InventoryMovementListResponseDto,
  StockLotListResponseDto,
  StockLotResponseDto,
} from '../dto/response/admin-inventory.dto';

// -----------------------------------------------------------------------------
// [INVEN-001] List Ring Blank Stocks Docs
// -----------------------------------------------------------------------------
export function ApiListRingBlankStocksDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-001] List Ring Blank Stocks',
      description:
        'Requires MANAGER or ADMIN role. Retrieves physical inventory lots of ring blanks by variant and status.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of ring blank stock lots retrieved successfully.',
      type: StockLotListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-002] Receive Ring Blank Stock Docs
// -----------------------------------------------------------------------------
export function ApiReceiveRingBlankStockDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-002] Receive Ring Blank Stock',
      description:
        'Requires MANAGER or ADMIN role. Receipts new batch of ring blanks into warehouse inventory and records audit movement.',
    }),
    ApiResponse({
      status: 201,
      description: 'Ring blank stock received successfully.',
      type: StockLotResponseDto,
    }),
    ApiResponse({
      status: 422,
      description: 'Invalid receipt quantity (must be > 0).',
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-003] List Gemstone Batches Docs
// -----------------------------------------------------------------------------
export function ApiListGemstoneBatchesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-003] List Gemstone Batches',
      description:
        'Requires MANAGER or ADMIN role. Retrieves melee / standard gemstone stock lots by option and status.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of gemstone batches retrieved successfully.',
      type: StockLotListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-004] Receive Gemstone Batch Docs
// -----------------------------------------------------------------------------
export function ApiReceiveGemstoneBatchDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-004] Receive Gemstone Batch',
      description:
        'Requires MANAGER or ADMIN role. Receipts bulk melee gemstone stock into warehouse inventory and records audit movement.',
    }),
    ApiResponse({
      status: 201,
      description: 'Gemstone batch received successfully.',
      type: StockLotResponseDto,
    }),
    ApiResponse({
      status: 422,
      description: 'Invalid receipt quantity (must be > 0).',
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-005] List Certified Gemstones Availability Docs
// -----------------------------------------------------------------------------
export function ApiListCertifiedGemstoneAvailabilityDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-005] List Certified Gemstones Availability',
      description:
        'Public / Client endpoint. Checks available unique certified diamonds / gemstones for custom ring assembly.',
    }),
    ApiResponse({
      status: 200,
      description:
        'List of available certified gemstones retrieved successfully.',
      type: CertifiedGemstoneListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-006] Create Certified Gemstone Docs
// -----------------------------------------------------------------------------
export function ApiCreateCertifiedGemstoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-006] Register Certified Gemstone',
      description:
        'Requires MANAGER or ADMIN role. Registers a unique certified gemstone (GIA/IGI) into vault inventory with audit trail.',
    }),
    ApiResponse({
      status: 201,
      description: 'Certified gemstone registered successfully.',
      type: CertifiedGemstoneResponseDto,
    }),
    ApiResponse({
      status: 409,
      description: 'Gemstone with internal code already exists.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-012] List Inventory Movements Docs (Audit Ledger)
// -----------------------------------------------------------------------------
export function ApiListInventoryMovementsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-012] List Inventory Movements (Audit Ledger)',
      description:
        'Requires MANAGER or ADMIN role. Retrieves immutable warehouse audit movements (receipt, hold, reservation, adjustment).',
    }),
    ApiResponse({
      status: 200,
      description: 'List of inventory movements retrieved successfully.',
      type: InventoryMovementListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-013] Adjust Inventory Docs
// -----------------------------------------------------------------------------
export function ApiAdjustInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-013] Adjust Inventory (Audit Discrepancy)',
      description:
        'Requires MANAGER or ADMIN role. Adjusts stock lot quantity with mandatory audit reason and records movement.',
    }),
    ApiResponse({
      status: 200,
      description: 'Inventory adjusted successfully.',
      type: StockLotResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Target stock lot not found.',
    }),
    ApiResponse({
      status: 422,
      description:
        'Adjustment would result in negative or reserved-violating inventory.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [INVEN-007..011] Inventory Allocations Docs
// -----------------------------------------------------------------------------
export function ApiHoldInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-007] Hold Inventory Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Holds stock lot or certified gemstone with TTL for a ring item.',
    }),
    ApiResponse({
      status: 201,
      description: 'Stock held successfully.',
    }),
    ApiResponse({
      status: 409,
      description: 'Insufficient stock or gemstone not available.',
    }),
  );
}

export function ApiReserveInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-008] Reserve Inventory Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Confirms reservation after deposit payment, clearing TTL.',
    }),
    ApiResponse({
      status: 200,
      description: 'Stock reserved successfully.',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid allocation status (must be HOLD).',
    }),
  );
}

export function ApiAllocateInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-009] Allocate Inventory to Production Attempt',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Binds held/reserved stock to a production attempt.',
    }),
    ApiResponse({
      status: 200,
      description: 'Stock allocated to production attempt successfully.',
    }),
  );
}

export function ApiConsumeInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-010] Consume Allocated Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Consumes stock after successful production, deducting on-hand.',
    }),
    ApiResponse({
      status: 200,
      description: 'Stock consumed successfully and movement ledger updated.',
    }),
  );
}

export function ApiReleaseInventoryDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-011] Release Allocation Back to Stock',
      description:
        'Requires INVENTORY_ALLOCATE permission / MANAGER role. Releases reserved or allocated stock back to available warehouse pool.',
    }),
    ApiResponse({
      status: 200,
      description: 'Allocation released successfully.',
    }),
  );
}
