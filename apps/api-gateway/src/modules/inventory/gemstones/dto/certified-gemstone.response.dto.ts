import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CertifiedGemstoneResponseDto {
  @ApiProperty({ example: '44444444-4444-4444-4444-444444444444' })
  id!: string;

  @ApiProperty({ example: 'CERT-DIA-GIA-992182' })
  internalCode!: string;

  @ApiProperty({ example: '33333333-3333-3333-3333-333333333333' })
  gemstoneOptionId!: string;

  @ApiPropertyOptional({ example: 'GIA' })
  certificateProvider?: string;

  @ApiPropertyOptional({ example: 'GIA-2219482910' })
  certificateNumber?: string;

  @ApiPropertyOptional({
    example: 'https://www.gia.edu/report-check?reportno=2219482910',
  })
  certificateUrl?: string;

  @ApiPropertyOptional({ example: '{"cut":"EXCELLENT","carat":1.02}' })
  certificateMetadataJson?: string;

  @ApiPropertyOptional({ example: 65000000 })
  purchaseCost?: number;

  @ApiProperty({
    enum: ['AVAILABLE', 'RESERVED', 'ALLOCATED', 'CONSUMED', 'SOLD'],
    example: 'AVAILABLE',
  })
  status!: string;

  @ApiPropertyOptional({ example: 'VAULT-01-SLOT-12' })
  locationCode?: string;

  @ApiPropertyOptional({ example: '2026-11-14T08:00:00.000Z' })
  receivedAt?: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  updatedAt!: string;
}

export class AvailableCertifiedGemstoneResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  gemstoneOptionId!: string;

  @ApiPropertyOptional({ example: 'GIA' })
  certificateProvider?: string;

  @ApiProperty({ enum: ['AVAILABLE'] })
  status!: string;
}

export class CertifiedGemstoneListResponseDto {
  @ApiProperty({ type: () => [AvailableCertifiedGemstoneResponseDto] })
  items!: AvailableCertifiedGemstoneResponseDto[];

  @ApiProperty({ example: 8 })
  total!: number;
}
