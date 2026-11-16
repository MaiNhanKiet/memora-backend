import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  CertifiedGemstoneResponseDto,
  StockLotListResponseDto,
  StockLotResponseDto,
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

export function ApiListGemstoneBatchesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-003] List Gemstone Batches',
      description:
        'Requires INVENTORY_VIEW permission / MANAGER role. Lists melee/accent gemstone inventory batches.',
    }),
    bearer,
    ApiSuccessResponse({
      type: StockLotListResponseDto,
      status: 200,
      description: 'List of gemstone batches retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiReceiveGemstoneBatchDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-004] Receive Gemstone Batch',
      description:
        'Requires INVENTORY_RECEIVE permission / MANAGER role. Records incoming melee/accent gemstones lot, increments on-hand quantity, and appends movement ledger.',
    }),
    bearer,
    ApiSuccessResponse({
      type: StockLotResponseDto,
      status: 201,
      description: 'Gemstone batch received successfully.',
    }),
    ApiResponse({
      status: 404,
      description: 'Gemstone option not found.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiCreateCertifiedGemstoneDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-006] Create Certified Gemstone',
      description:
        'Requires INVENTORY_RECEIVE permission / MANAGER role. Registers a unique certified gemstone (center stone) with laboratory certificate details.',
    }),
    bearer,
    ApiSuccessResponse({
      type: CertifiedGemstoneResponseDto,
      status: 201,
      description: 'Certified gemstone registered successfully in AVAILABLE state.',
    }),
    ApiResponse({
      status: 409,
      description: 'Internal code or certificate number already exists.',
    }),
    unauthorized,
    forbidden,
  );
}
