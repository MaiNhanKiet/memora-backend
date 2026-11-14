import { applyDecorators } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import {
  AbandonCartResponseDto,
  AddCartItemResponseDto,
  CartResponseDto,
  RemoveCartItemResponseDto,
  UpdateCartItemResponseDto,
  ValidateCheckoutResponseDto,
} from '../dto/cart.dto';

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
      summary: '[DESIG-003] Update ring draft in cart',
      description:
        'Updates target size, personalization package, or digital memory flag and recalculates price.',
    }),
    ApiParam({ name: 'draftId', type: String, description: 'Draft UUID' }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: UpdateCartItemResponseDto,
      status: 200,
      description: 'Draft updated successfully',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({
      status: 403,
      description: 'Not authorized for this cart item',
    }),
    ApiResponse({ status: 404, description: 'Draft not found in cart' }),
  );
}

export function ApiRemoveCartItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-004] Remove draft from cart',
      description: 'Deletes a ring draft from the active cart.',
    }),
    ApiParam({ name: 'draftId', type: String, description: 'Draft UUID' }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: RemoveCartItemResponseDto,
      status: 200,
      description: 'Draft removed from cart',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({
      status: 403,
      description: 'Not authorized for this cart item',
    }),
    ApiResponse({ status: 404, description: 'Draft not found in cart' }),
  );
}

export function ApiValidateCheckoutDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-005] Validate cart before create order',
      description:
        'Revalidates stock, size, and repricing for 1-2 selected drafts before checkout.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: ValidateCheckoutResponseDto,
      status: 200,
      description: 'Checkout validation result',
    }),
    ApiResponse({
      status: 400,
      description: 'Empty cart or more than 2 drafts selected',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
  );
}

export function ApiAbandonCartDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-006] Mark cart as abandoned',
      description: 'Changes active cart status to ABANDONED.',
    }),
    GUEST_HEADER_DOC,
    ApiSuccessResponse({
      type: AbandonCartResponseDto,
      status: 200,
      description: 'Cart marked as abandoned',
    }),
    ApiResponse({ status: 401, description: 'Missing actor identity' }),
    ApiResponse({ status: 404, description: 'No active cart found' }),
  );
}
