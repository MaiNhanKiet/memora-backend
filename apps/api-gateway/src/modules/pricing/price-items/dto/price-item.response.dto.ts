import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceVersionResponseDto } from './price-version.response.dto';

export class PriceItemResponseDto {
  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  id!: string;

  @ApiProperty({
    enum: ['RING_BLANK', 'GEMSTONE', 'CERTIFIED_GEMSTONE', 'PERSONALIZATION'],
    example: 'RING_BLANK',
  })
  priceType!: string;

  @ApiProperty({ example: 'PI-RB-SOL-14KW-52' })
  code!: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  templateVariantId?: string;

  @ApiPropertyOptional({ example: '22222222-2222-2222-2222-222222222222' })
  gemstoneOptionId?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({ example: 'FINGERPRINT' })
  personalizationPackage?: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status!: string;

  @ApiPropertyOptional({ type: PriceVersionResponseDto })
  activeVersion?: PriceVersionResponseDto;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  updatedAt!: string;
}

export class PriceItemListResponseDto {
  @ApiProperty({ type: [PriceItemResponseDto] })
  items!: PriceItemResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;
}
