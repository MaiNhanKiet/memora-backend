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

export class CertifiedGemstoneListResponseDto {
  @ApiProperty({ type: () => [CertifiedGemstoneResponseDto] })
  items!: CertifiedGemstoneResponseDto[];

  @ApiProperty({ example: 8 })
  total!: number;
}

export class InventoryMovementResponseDto {
  @ApiProperty({ example: '55555555-5555-5555-5555-555555555555' })
  id!: string;

  @ApiProperty({
    enum: [
      'RECEIPT',
      'HOLD',
      'RESERVATION',
      'ALLOCATION',
      'CONSUMPTION',
      'RELEASE',
      'ADJUSTMENT',
    ],
    example: 'RECEIPT',
  })
  movementType!: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  stockLotId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({ example: '66666666-6666-6666-6666-666666666666' })
  allocationId?: string;

  @ApiPropertyOptional({ example: '77777777-7777-7777-7777-777777777777' })
  ringItemId?: string;

  @ApiPropertyOptional({ example: '88888888-8888-8888-8888-888888888888' })
  productionAttemptId?: string;

  @ApiProperty({ example: 10 })
  quantity!: number;

  @ApiPropertyOptional({ example: 2500000 })
  unitCostSnapshot?: number;

  @ApiPropertyOptional({ example: 'Initial ring blank receipt' })
  reason?: string;

  @ApiPropertyOptional({ example: '99999999-9999-9999-9999-999999999999' })
  performedByUserId?: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  occurredAt!: string;

  @ApiPropertyOptional({ example: '{}' })
  metadataJson?: string;
}

export class InventoryMovementListResponseDto {
  @ApiProperty({ type: () => [InventoryMovementResponseDto] })
  items!: InventoryMovementResponseDto[];

  @ApiProperty({ example: 24 })
  total!: number;
}
