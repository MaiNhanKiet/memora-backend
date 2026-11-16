import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { CertifiedGemstoneListResponseDto } from '../dto';

export function ApiListCertifiedGemstoneAvailabilityDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[INVEN-005] Check Certified Gemstones Availability',
      description:
        'Public endpoint for ring configurator. Lists certified gemstones currently available for customer selection.',
    }),
    ApiSuccessResponse({
      type: CertifiedGemstoneListResponseDto,
      status: 200,
      description: 'List of available certified gemstones retrieved successfully.',
    }),
  );
}
