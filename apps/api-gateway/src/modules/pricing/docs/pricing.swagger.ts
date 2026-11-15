import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import { EstimatePriceResponseDto } from '../dto/estimate-price.dto';

export function ApiEstimatePriceDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-001] Estimate configuration price in real-time',
      description:
        'Calculates real-time price estimation for a configured ring including ring blank, gemstones, personalization package, and resize surcharge',
    }),
    ApiSuccessResponse({
      type: EstimatePriceResponseDto,
      status: 200,
      description: 'Estimated price breakdown',
    }),
    ApiResponse({
      status: 404,
      description: 'Template variant not found or not active',
    }),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity - target size out of bounds',
    }),
  );
}
