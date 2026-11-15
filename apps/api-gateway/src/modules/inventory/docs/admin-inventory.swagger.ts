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
