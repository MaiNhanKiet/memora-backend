import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AcceptServiceQuoteResponseDto,
  ListClaimQuotesResponseDto,
} from '../dto/claim-quotes.dto';

export function ApiListClaimQuotes() {
  return applyDecorators(
    ApiTags('Claims'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 200,
      description: 'Service quotes retrieved successfully',
      type: ListClaimQuotesResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid claim ID or parameters',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized access',
    }),
  );
}

export function ApiAcceptServiceQuote() {
  return applyDecorators(
    ApiTags('Claims'),
    ApiBearerAuth(),
    ApiOperation({
      summary: '[ORDER-025] Customer accepts a service quote for a post-purchase claim',
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
    ApiResponse({
      status: 200,
      description: 'Service quote accepted successfully',
      type: AcceptServiceQuoteResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Quote is not ISSUED, has expired, or is not a SERVICE quote',
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized access',
    }),
    ApiResponse({
      status: 404,
      description: 'Quote or claim not found',
    }),
  );
}
