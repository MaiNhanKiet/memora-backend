import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  AcceptServiceQuoteResponseDto,
  ClaimQuoteSummaryDto,
} from '../dto/claim-quotes.dto';
import { PaymentLinkResponseDto } from '../../payments/dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller lacks required role or ownership',
});
const notFound = (resource: string) =>
  ApiResponse({
    status: 404,
    description: `${resource} not found`,
  });

export function ApiListClaimQuotes() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-024] View service quotes for a post-purchase claim',
      description:
        'Retrieves all service quotes (quote_type = SERVICE) associated with the given claimId. Accessible by the customer or authenticated caller.',
    }),
    ApiParam({
      name: 'claimId',
      description: 'Claim UUID',
      type: String,
      example: 'c1b81e4b-70c1-4ebc-b391-4770ff901111',
    }),
    ApiSuccessResponse({
      type: ClaimQuoteSummaryDto,
      isArray: true,
      description: 'Service quotes retrieved successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid claim ID or parameters',
    }),
    unauthorized,
    forbidden,
    notFound('Claim'),
  );
}

export function ApiAcceptServiceQuote() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary:
        '[ORDER-025] Customer accepts a service quote for a post-purchase claim',
      description:
        'Accepts an ISSUED service quote linked to the specified claimId. Changes status to ACCEPTED and records customer acceptance timestamp.',
    }),
    ApiParam({
      name: 'claimId',
      description: 'Claim UUID',
      type: String,
      example: 'c1b81e4b-70c1-4ebc-b391-4770ff901111',
    }),
    ApiParam({
      name: 'quoteId',
      description: 'Quote UUID',
      type: String,
      example: 'd0b81e4b-70c1-4ebc-b391-4770ff906666',
    }),
    ApiSuccessResponse({
      type: AcceptServiceQuoteResponseDto,
      status: 200,
      description: 'Service quote accepted successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'Quote is expired or not in ISSUED status',
    }),
    unauthorized,
    forbidden,
    notFound('Claim or quote'),
  );
}

export function ApiCreateClaimPaymentLink() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[ORDER-026] Create PayOS payment link for claim service quote',
      description:
        'Generates PayOS VietQR payment link for the accepted service quote on a post-purchase claim.',
    }),
    ApiParam({
      name: 'claimId',
      description: 'Claim UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: PaymentLinkResponseDto,
      status: 201,
      description: 'Payment link created successfully',
    }),
    ApiResponse({
      status: 400,
      description: 'No ACCEPTED service quote found for this claim',
    }),
    unauthorized,
    forbidden,
    notFound('Claim or quote'),
  );
}
