import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RejectFinalQuoteBodyDto {
  @ApiPropertyOptional({
    description:
      'Quote UUID being rejected (defaults to current_quote_id if omitted)',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  quoteId?: string;

  @ApiProperty({
    description: 'Reason for rejecting the final quote',
    example:
      'Diamond price is higher than discussed, request replacement gemstone',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RejectFinalQuoteResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'REJECTED' })
  status!: string;

  @ApiProperty({ example: 'Diamond price is higher than discussed' })
  reason!: string;

  @ApiProperty({ example: 'PENDING_FINAL_QUOTE' })
  updatedOrderStatus!: string;
}
