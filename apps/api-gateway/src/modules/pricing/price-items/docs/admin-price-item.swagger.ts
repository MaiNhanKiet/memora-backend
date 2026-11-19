import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  PriceItemListResponseDto,
  PriceItemResponseDto,
  PriceVersionListResponseDto,
  PriceVersionResponseDto,
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
const notFound = (res: string) =>
  ApiResponse({
    status: 404,
    description: `${res} not found`,
  });

export function ApiListPriceItemsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-002] List Price Items',
      description:
        'Requires MANAGER or ADMIN role. Returns paginated price items with active version price info.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PriceItemListResponseDto,
      status: 200,
      description: 'List of price items retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiCreatePriceItemDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-003] Create Price Item',
      description:
        'Requires MANAGER or ADMIN role. Defines a new price item mapped to a template variant, gemstone, or personalization package.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PriceItemResponseDto,
      status: 201,
      description: 'Price item created successfully.',
    }),
    ApiResponse({
      status: 409,
      description: 'Price item with given code already exists.',
    }),
    ApiResponse({
      status: 422,
      description: 'Missing required target reference for priceType.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiListPriceVersionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-004] List Price Versions',
      description:
        'Requires MANAGER or ADMIN role. Lists historical price versions for a price item.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PriceVersionListResponseDto,
      status: 200,
      description: 'List of price versions retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiCreatePriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-005] Create Price Version',
      description:
        'Requires MANAGER or ADMIN role. Creates a new DRAFT price version for a price item.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PriceVersionResponseDto,
      status: 201,
      description: 'Price version created successfully in DRAFT status.',
    }),
    notFound('Price item'),
    unauthorized,
    forbidden,
  );
}

export function ApiApprovePriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-006] Approve Price Version',
      description:
        'Requires MANAGER or ADMIN role. Activates a DRAFT price version, superseding previously active version.',
    }),
    bearer,
    ApiParam({
      name: 'versionId',
      description: 'UUID of the price version to approve',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: PriceVersionResponseDto,
      status: 200,
      description: 'Price version approved and activated successfully.',
    }),
    ApiResponse({
      status: 409,
      description: 'Price version is not in DRAFT status.',
    }),
    notFound('Price version'),
    unauthorized,
    forbidden,
  );
}

export function ApiRejectPriceVersionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-007] Reject Price Version',
      description:
        'Requires MANAGER or ADMIN role. Rejects a DRAFT price version with a required review note.',
    }),
    bearer,
    ApiParam({
      name: 'versionId',
      description: 'UUID of the price version to reject',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: PriceVersionResponseDto,
      status: 200,
      description: 'Price version rejected successfully.',
    }),
    ApiResponse({
      status: 409,
      description: 'Price version is not in DRAFT status.',
    }),
    notFound('Price version'),
    unauthorized,
    forbidden,
  );
}
