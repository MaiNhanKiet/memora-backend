import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuoteLineItemDto } from '../../quotes/dto/quote-response.dto';

export class ClaimQuoteSummaryDto {
  @ApiProperty({ description: 'Quote UUID', example: 'd0b81e4b-70c1-4ebc-b391-4770ff906666' })
  id!: string;

  @ApiProperty({ description: 'Quote unique number', example: 'QUO-CLM-202611-0001' })
  quoteNo!: string;

  @ApiPropertyOptional({ description: 'Claim UUID', example: 'c1b81e4b-70c1-4ebc-b391-4770ff901111' })
  claimId?: string;

  @ApiPropertyOptional({ description: 'Order UUID if attached', example: 'a1b81e4b-70c1-4ebc-b391-4770ff902222' })
  orderId?: string;

  @ApiProperty({ description: 'Type of quote (e.g. SERVICE)', example: 'SERVICE' })
  quoteType!: string;

  @ApiProperty({ description: 'Version number', example: 1 })
  versionNo!: number;

  @ApiProperty({ description: 'Quote status', example: 'ISSUED' })
  status!: string;

  @ApiProperty({ description: 'Subtotal amount', example: 500000 })
  subtotalAmount!: number;

  @ApiProperty({ description: 'Delivery amount', example: 30000 })
  deliveryAmount!: number;

  @ApiProperty({ description: 'Adjustment amount', example: 0 })
  adjustmentAmount!: number;

  @ApiProperty({ description: 'Total amount', example: 530000 })
  totalAmount!: number;

  @ApiProperty({ description: 'Currency', example: 'VND' })
  currency!: string;

  @ApiPropertyOptional({ description: 'Validity date ISO' })
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Staff who created this quote' })
  createdByUserId?: string;

  @ApiPropertyOptional({ description: 'Issued timestamp ISO' })
  issuedAt?: string;

  @ApiPropertyOptional({ description: 'Accepted by customer identity UUID' })
  acceptedByCustomerIdentityId?: string;

  @ApiPropertyOptional({ description: 'Accepted timestamp ISO' })
  acceptedAt?: string;

  @ApiProperty({ description: 'Created timestamp ISO' })
  createdAt!: string;

  @ApiProperty({ type: [QuoteLineItemDto], description: 'Line items of this service quote' })
  items!: QuoteLineItemDto[];
}

export class ListClaimQuotesResponseDto {
  @ApiProperty({ type: [ClaimQuoteSummaryDto], description: 'List of service quotes for this claim' })
  quotes!: ClaimQuoteSummaryDto[];
}

export class AcceptServiceQuoteResponseDto {
  @ApiProperty({ description: 'Operation success flag', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Accepted Quote UUID', example: 'd0b81e4b-70c1-4ebc-b391-4770ff906666' })
  quoteId!: string;

  @ApiProperty({ description: 'New status', example: 'ACCEPTED' })
  status!: string;

  @ApiProperty({ description: 'Accepted timestamp ISO' })
  acceptedAt!: string;
}
