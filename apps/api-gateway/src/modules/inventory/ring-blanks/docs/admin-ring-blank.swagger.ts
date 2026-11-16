import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { StockLotListResponseDto, StockLotResponseDto } from '../dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller lacks required role or ownership',
});

export function ApiListRingBlankStocksDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-001] List Ring Blank Stocks',
      description:
        'Requires INVENTORY_VIEW permission / MANAGER role. Lists inventory stock lots for ring blanks with quantities and locations.',
    }),
    bearer,
    ApiSuccessResponse({
      type: StockLotListResponseDto,
      status: 200,
      description: 'List of ring blank stocks retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiReceiveRingBlankStockDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-002] Receive Ring Blank Stock',
      description:
        'Requires INVENTORY_RECEIVE permission / MANAGER role. Records incoming physical ring blanks, creates or updates stock lot, and appends RECEIPT movement ledger entry.',
    }),
    bearer,
    ApiSuccessResponse({
      type: StockLotResponseDto,
      status: 201,
      description: 'Ring blank stock received successfully.',
    }),
    ApiResponse({
      status: 404,
      description: 'Template variant not found.',
    }),
    unauthorized,
    forbidden,
  );
}
