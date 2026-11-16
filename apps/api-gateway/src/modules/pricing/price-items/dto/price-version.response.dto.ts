import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceVersionResponseDto {
  @ApiProperty({ example: '11111111-1111-1111-1111-111111111111' })
  id!: string;

  @ApiProperty({ example: '22222222-2222-2222-2222-222222222222' })
  priceItemId!: string;

  @ApiProperty({ example: 3500000 })
  amount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({
    enum: ['DRAFT', 'ACTIVE', 'REJECTED', 'SUPERSEDED'],
    example: 'ACTIVE',
  })
  status!: string;

  @ApiPropertyOptional({ example: '2026-11-15T00:00:00.000Z' })
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-11-15T00:00:00.000Z' })
  effectiveTo?: string;

  @ApiProperty({ example: 'MANUAL' })
  sourceType!: string;

  @ApiPropertyOptional({ example: '{"spotPrice": 2450.5}' })
  marketSnapshotJson?: string;

  @ApiPropertyOptional({ example: 'Approved by pricing manager' })
  reviewNote?: string;

  @ApiPropertyOptional({ example: '33333333-3333-3333-3333-333333333333' })
  createdByUserId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  reviewedByUserId?: string;

  @ApiPropertyOptional({ example: '2026-11-14T10:00:00.000Z' })
  reviewedAt?: string;

  @ApiProperty({ example: '2026-11-14T09:00:00.000Z' })
  createdAt!: string;
}

export class PriceVersionListResponseDto {
  @ApiProperty({ type: [PriceVersionResponseDto] })
  versions!: PriceVersionResponseDto[];

  @ApiProperty({ example: 1 })
  total!: number;
}
