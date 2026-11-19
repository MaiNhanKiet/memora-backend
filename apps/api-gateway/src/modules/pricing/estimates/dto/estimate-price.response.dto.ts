import { ApiProperty } from '@nestjs/swagger';

export class PriceBreakdownDto {
  @ApiProperty({ example: 8000000 })
  baseBlankPrice!: number;

  @ApiProperty({ example: 6500000 })
  gemstonesPrice!: number;

  @ApiProperty({ example: 800000 })
  personalizationFee!: number;

  @ApiProperty({ example: 200000 })
  resizeFee!: number;
}

export class GemstonePriceLineItemDto {
  @ApiProperty({ example: 'g1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  gemstoneOptionId!: string;

  @ApiProperty({ example: 6500000 })
  price!: number;
}

export class EstimatePriceResponseDto {
  @ApiProperty({ example: 15500000 })
  estimatedTotal!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '2026-11-14T03:35:00.000Z' })
  estimatedAt!: string;

  @ApiProperty({ type: PriceBreakdownDto })
  breakdown!: PriceBreakdownDto;

  @ApiProperty({ type: [GemstonePriceLineItemDto] })
  gemstoneLineItems!: GemstonePriceLineItemDto[];
}
