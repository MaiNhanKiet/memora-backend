import { applyDecorators } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  AbandonCartResponseDto,
  AddCartItemResponseDto,
  CartResponseDto,
  RemoveCartItemResponseDto,
  UpdateCartItemResponseDto,
  ValidateCheckoutResponseDto,
} from '../dto';

const GUEST_HEADER_DOC = ApiHeader({
  name: 'x-guest-session-id',
  required: false,
  description: 'Guest session UUID when not authenticated with Bearer JWT',
});

export function ApiGetCartDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-001] Get active cart and drafts',
      description:
        'Retrieves current active cart and ring design drafts. Auto-creates empty cart if none exists.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: CartResponseDto,
      status: 200,
      description: 'Active cart details',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
  );
}

export function ApiAddCartItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-002] Add configured ring draft to cart',
      description:
        'Adds a validated ring configuration into active cart. Calculates real-time estimated price.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: AddCartItemResponseDto,
      status: 201,
      description: 'Draft added to cart',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({ status: 404, description: 'Template variant not found' }),
    ApiResponse({ status: 422, description: 'Target size out of bounds' }),
  );
}

export function ApiUpdateCartItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-003] Update cart draft options',
      description:
        'Updates size, personalization package, or memory toggle on an un-ordered ring draft.',
    }),
    GUEST_HEADER_DOC,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the design draft inside the cart',
      example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    }),
    ApiSuccessResponse({
      type: UpdateCartItemResponseDto,
      status: 200,
      description: 'Draft updated successfully',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({ status: 404, description: 'Draft not found in active cart' }),
    ApiResponse({ status: 422, description: 'Size out of resize bounds' }),
  );
}

export function ApiRemoveCartItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-004] Remove draft item from cart',
      description: 'Soft removes a ring draft item from active cart.',
    }),
    GUEST_HEADER_DOC,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the design draft to remove',
      example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    }),
    ApiSuccessResponse({
      type: RemoveCartItemResponseDto,
      status: 200,
      description: 'Draft removed from cart',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({ status: 404, description: 'Draft not found in cart' }),
  );
}

export function ApiValidateCheckoutDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-005] Validate cart items for checkout readiness',
      description:
        'Re-validates material, gemstone availability, and price validity for 1-2 selected drafts prior to order placement.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: ValidateCheckoutResponseDto,
      status: 200,
      description: 'Validation result and latest pricing',
    }),
    ApiResponse({ status: 400, description: 'Invalid draft selection' }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
  );
}

export function ApiAbandonCartDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-006] Abandon cart',
      description: 'Marks current active cart as abandoned.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: AbandonCartResponseDto,
      status: 200,
      description: 'Cart marked as abandoned',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
  );
}
