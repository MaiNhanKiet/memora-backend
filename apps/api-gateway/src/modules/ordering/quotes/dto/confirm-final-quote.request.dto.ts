import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ConfirmFinalQuoteBodyDto {
  @ApiPropertyOptional({
    description:
      'Specific quote UUID to confirm (defaults to order current_quote_id if omitted)',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  quoteId?: string;

  @ApiPropertyOptional({
    description: 'Customer notes',
    example: 'Ready to proceed with fabrication',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalConfirmationItemSummaryDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringItemId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringItemVersionId!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;
}

export class ConfirmFinalQuoteResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  confirmationId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  confirmedAt!: string;

  @ApiProperty({ example: 'AWAITING_P2' })
  nextOrderStatus!: string;

  @ApiProperty({ type: [FinalConfirmationItemSummaryDto] })
  items!: FinalConfirmationItemSummaryDto[];
}

export class FinalConfirmationDetailDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'QUO-ORD-123-F1' })
  quoteNo!: string;

  @ApiProperty({ example: 14500000 })
  quoteTotalAmount!: number;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  confirmedByCustomerIdentityId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  confirmedAt!: string;

  @ApiPropertyOptional({ example: '2026-11-15T09:00:00.000Z' })
  invalidatedAt?: string;

  @ApiPropertyOptional({ example: 'Superseded by new confirmation' })
  invalidationReason?: string;

  @ApiProperty({ type: [FinalConfirmationItemSummaryDto] })
  items!: FinalConfirmationItemSummaryDto[];
}

export class GetFinalConfirmationsResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ type: [FinalConfirmationDetailDto] })
  confirmations!: FinalConfirmationDetailDto[];
}
