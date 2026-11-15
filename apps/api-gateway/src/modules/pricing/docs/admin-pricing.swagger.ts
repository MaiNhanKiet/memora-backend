import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  PriceItemListResponseDto,
  PriceItemResponseDto,
  PriceVersionListResponseDto,
  PriceVersionResponseDto,
  PricingRuleListResponseDto,
  PricingRuleResponseDto,
} from '../dto/response/admin-pricing.dto';

// -----------------------------------------------------------------------------
// [PRICI-002] List Price Items Docs
// -----------------------------------------------------------------------------
export function ApiListPriceItemsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-002] List Price Items',
      description:
        'Requires MANAGER or ADMIN role. Returns paginated price items with active version price info.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of price items retrieved successfully.',
      type: PriceItemListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-003] Create Price Item Docs
// -----------------------------------------------------------------------------
export function ApiCreatePriceItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-003] Create Price Item',
      description:
        'Requires MANAGER or ADMIN role. Defines a new price item mapped to a template variant, gemstone, or personalization package.',
    }),
    ApiResponse({
      status: 201,
      description: 'Price item created successfully.',
      type: PriceItemResponseDto,
    }),
    ApiResponse({
      status: 409,
      description: 'Price item with given code already exists.',
    }),
    ApiResponse({
      status: 422,
      description: 'Missing required target reference for priceType.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-004] List Price Versions Docs
// -----------------------------------------------------------------------------
export function ApiListPriceVersionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-004] List Price Versions',
      description:
        'Requires MANAGER or ADMIN role. Returns history of price versions for auditing or item review.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of price versions retrieved successfully.',
      type: PriceVersionListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-005] Create Price Version Docs
// -----------------------------------------------------------------------------
export function ApiCreatePriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-005] Create Proposed Price Version (DRAFT)',
      description:
        'Requires MANAGER or ADMIN role. Submits a new price proposal in DRAFT state.',
    }),
    ApiResponse({
      status: 201,
      description: 'Draft price version created successfully.',
      type: PriceVersionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Target price item not found.',
    }),
    ApiResponse({
      status: 422,
      description: 'Invalid price amount or constraints.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-006] Approve Price Version Docs
// -----------------------------------------------------------------------------
export function ApiApprovePriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-006] Approve Price Version',
      description:
        'Requires MANAGER or ADMIN role. Transitions price version from DRAFT to ACTIVE, automatically superseding previous ACTIVE version.',
    }),
    ApiResponse({
      status: 200,
      description: 'Price version approved and activated.',
      type: PriceVersionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Price version not found.',
    }),
    ApiResponse({
      status: 422,
      description: 'Price version is not in DRAFT state.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-007] Reject Price Version Docs
// -----------------------------------------------------------------------------
export function ApiRejectPriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-007] Reject Price Version',
      description:
        'Requires MANAGER or ADMIN role. Rejects draft price version with review note.',
    }),
    ApiResponse({
      status: 200,
      description: 'Price version rejected.',
      type: PriceVersionResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Price version not found.',
    }),
    ApiResponse({
      status: 422,
      description: 'Price version is not in DRAFT state.',
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-008] List Pricing Rules Docs
// -----------------------------------------------------------------------------
export function ApiListPricingRulesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-008] List Pricing Rules',
      description:
        'Requires MANAGER or ADMIN role. Retrieves delivery, resize, cancellation and redelivery fee rules.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of pricing rules retrieved successfully.',
      type: PricingRuleListResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-009] Create Pricing Rule Docs
// -----------------------------------------------------------------------------
export function ApiCreatePricingRuleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-009] Create Pricing Rule (DRAFT)',
      description:
        'Requires MANAGER or ADMIN role. Creates a new fee calculation rule in DRAFT state.',
    }),
    ApiResponse({
      status: 201,
      description: 'Draft pricing rule created successfully.',
      type: PricingRuleResponseDto,
    }),
  );
}

// -----------------------------------------------------------------------------
// [PRICI-010] Activate Pricing Rule Docs
// -----------------------------------------------------------------------------
export function ApiActivatePricingRuleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-010] Activate Pricing Rule',
      description:
        'Requires MANAGER or ADMIN role. Activates draft pricing rule, archiving any conflicting active rule.',
    }),
    ApiResponse({
      status: 200,
      description: 'Pricing rule activated successfully.',
      type: PricingRuleResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Pricing rule not found.',
    }),
    ApiResponse({
      status: 422,
      description: 'Pricing rule is not in DRAFT state.',
    }),
  );
}
