import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockLotResponseDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id!: string;

  @ApiProperty({ example: 'RB-20261114-001' })
  stockCode!: string;

  @ApiProperty({
    enum: ['RING_BLANK', 'GEMSTONE'],
    example: 'RING_BLANK',
  })
  stockType!: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  templateVariantId?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  gemstoneOptionId?: string;

  @ApiPropertyOptional({ example: 'LOT-2026-11A' })
  lotCode?: string;

  @ApiPropertyOptional({ example: 'SUP-8821' })
  supplierRef?: string;

  @ApiProperty({ example: 10 })
  quantityOnHand!: number;

  @ApiProperty({ example: 0 })
  quantityReserved!: number;

  @ApiPropertyOptional({ example: 2500000 })
  unitCost?: number;

  @ApiPropertyOptional({ example: 'BIN-A1-04' })
  locationCode?: string;

  @ApiProperty({
    enum: ['AVAILABLE', 'EXHAUSTED', 'LOCKED'],
    example: 'AVAILABLE',
  })
  status!: string;

  @ApiPropertyOptional({ example: '2026-11-14T08:00:00.000Z' })
  receivedAt?: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  updatedAt!: string;
}

export class StockLotListResponseDto {
  @ApiProperty({ type: () => [StockLotResponseDto] })
  items!: StockLotResponseDto[];

  @ApiProperty({ example: 15 })
  total!: number;
}
