import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  PricingRuleListResponseDto,
  PricingRuleResponseDto,
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

export function ApiListPricingRulesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-008] List Pricing Rules',
      description:
        'Requires MANAGER or ADMIN role. Returns matrix rules for resize, delivery, cancellation, and rush orders.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PricingRuleListResponseDto,
      status: 200,
      description: 'List of pricing rules retrieved successfully.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiCreatePricingRuleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-009] Create Pricing Rule',
      description:
        'Requires MANAGER or ADMIN role. Creates a new DRAFT pricing rule with JSON configuration payload.',
    }),
    bearer,
    ApiSuccessResponse({
      type: PricingRuleResponseDto,
      status: 201,
      description: 'Pricing rule created successfully in DRAFT status.',
    }),
    ApiResponse({
      status: 409,
      description: 'Pricing rule with given code already exists.',
    }),
    unauthorized,
    forbidden,
  );
}

export function ApiActivatePricingRuleDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PRICI-010] Activate Pricing Rule',
      description:
        'Requires MANAGER or ADMIN role. Transitions a pricing rule from DRAFT to ACTIVE.',
    }),
    bearer,
    ApiParam({
      name: 'ruleId',
      description: 'UUID of the pricing rule to activate',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: PricingRuleResponseDto,
      status: 200,
      description: 'Pricing rule activated successfully.',
    }),
    notFound('Pricing rule'),
    unauthorized,
    forbidden,
  );
}
