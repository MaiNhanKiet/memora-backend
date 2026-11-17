import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuoteLineItemDto {
  @ApiProperty({ example: 'item-uuid' })
  id!: string;

  @ApiProperty({ example: 'RING_BLANK' })
  componentType!: string;

  @ApiPropertyOptional({ example: '18K Gold Setting' })
  description?: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 12000000 })
  unitAmount!: number;

  @ApiProperty({ example: 12000000 })
  lineAmount!: number;

  @ApiProperty({ example: 'CATALOG_BASE' })
  priceSourceType!: string;
}

export class FullQuoteDetailDto {
  @ApiProperty({ example: 'quo-uuid' })
  id!: string;

  @ApiProperty({ example: 'QUO-1731580000000-ABCD' })
  quoteNo!: string;

  @ApiProperty({ example: 'PROVISIONAL' })
  quoteType!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ example: 'ISSUED' })
  status!: string;

  @ApiProperty({ example: 15500000 })
  subtotalAmount!: number;

  @ApiProperty({ example: 0 })
  deliveryAmount!: number;

  @ApiProperty({ example: 0 })
  adjustmentAmount!: number;

  @ApiProperty({ example: 15500000 })
  totalAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ type: [QuoteLineItemDto] })
  items!: QuoteLineItemDto[];

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;
}

export class ListOrderQuotesResponseDto {
  @ApiProperty({ example: 'ord-uuid' })
  orderId!: string;

  @ApiProperty({ type: [FullQuoteDetailDto] })
  quotes!: FullQuoteDetailDto[];
}
