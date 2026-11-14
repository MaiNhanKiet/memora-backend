import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

// -----------------------------------------------------------------------------
// [INVEN-001] List Ring Blank Stocks Query
// -----------------------------------------------------------------------------
export class ListRingBlankStocksQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by template variant ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  templateVariantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['AVAILABLE', 'EXHAUSTED', 'LOCKED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [INVEN-002] Receive Ring Blank Stock Body
// -----------------------------------------------------------------------------
export class ReceiveRingBlankStockBodyDto {
  @ApiProperty({
    description: 'Template variant ID of the ring blank',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  templateVariantId!: string;

  @ApiPropertyOptional({
    description: 'Physical batch / lot code',
    example: 'LOT-RB-2026-11A',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotCode?: string;

  @ApiPropertyOptional({
    description: 'Supplier invoice / batch reference',
    example: 'INV-SUP-8821',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierRef?: string;

  @ApiProperty({
    description: 'Quantity received into inventory',
    example: 10,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit purchase cost in VND',
    example: 2500000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Storage bin / shelf location code',
    example: 'BIN-A1-04',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationCode?: string;

  @ApiPropertyOptional({
    description: 'Receipt timestamp ISO 8601',
    example: '2026-11-14T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  receivedAt?: string;
}

// -----------------------------------------------------------------------------
// [INVEN-003] List Gemstone Batches Query
// -----------------------------------------------------------------------------
export class ListGemstoneBatchesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by gemstone option ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  gemstoneOptionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['AVAILABLE', 'EXHAUSTED', 'LOCKED'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [INVEN-004] Receive Gemstone Batch Body
// -----------------------------------------------------------------------------
export class ReceiveGemstoneBatchBodyDto {
  @ApiProperty({
    description: 'Gemstone option ID for this batch',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  gemstoneOptionId!: string;

  @ApiPropertyOptional({
    description: 'Physical batch / lot code',
    example: 'LOT-GEM-DIA-1.5MM',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  lotCode?: string;

  @ApiPropertyOptional({
    description: 'Supplier reference',
    example: 'SUP-GEM-993',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  supplierRef?: string;

  @ApiProperty({
    description: 'Quantity of stones received',
    example: 100,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Unit cost per stone in VND',
    example: 350000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Storage bin location code',
    example: 'VAULT-GEM-02',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationCode?: string;

  @ApiPropertyOptional({
    description: 'Receipt timestamp ISO 8601',
    example: '2026-11-14T10:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  receivedAt?: string;
}

// -----------------------------------------------------------------------------
// [INVEN-005] List Certified Gemstones Availability Query
// -----------------------------------------------------------------------------
export class ListCertifiedGemstoneAvailabilityQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by gemstone option ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  gemstoneOptionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by availability status',
    default: 'AVAILABLE',
  })
  @IsOptional()
  @IsString()
  status?: string = 'AVAILABLE';

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [INVEN-006] Create Certified Gemstone Body
// -----------------------------------------------------------------------------
export class CreateCertifiedGemstoneBodyDto {
  @ApiProperty({
    description: 'Unique internal inventory tracking code',
    example: 'CERT-DIA-GIA-992182',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  internalCode!: string;

  @ApiProperty({
    description: 'Gemstone option ID matching specifications',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  gemstoneOptionId!: string;

  @ApiPropertyOptional({
    description: 'Certification institute (GIA, IGI, HRD, etc.)',
    example: 'GIA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateProvider?: string;

  @ApiPropertyOptional({
    description: 'Official certificate report number',
    example: 'GIA-2219482910',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  certificateNumber?: string;

  @ApiPropertyOptional({
    description: 'Digital certificate report URL',
    example: 'https://www.gia.edu/report-check?reportno=2219482910',
  })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional({
    description:
      'Detailed certificate metadata (cut, clarity, color, carat, proportions)',
    example: { cut: 'EXCELLENT', clarity: 'VVS1', color: 'D', carat: 1.02 },
  })
  @IsOptional()
  @IsObject()
  certificateMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Purchase cost in VND',
    example: 65000000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({
    description: 'Vault location code',
    example: 'SAFE-01-SLOT-12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationCode?: string;
}

// -----------------------------------------------------------------------------
// [INVEN-012] List Inventory Movements Query (Audit Ledger)
// -----------------------------------------------------------------------------
export class ListInventoryMovementsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by stock lot ID',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  stockLotId?: string;

  @ApiPropertyOptional({
    description: 'Filter by certified gemstone ID',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  certifiedGemstoneId?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    enum: [
      'RECEIPT',
      'HOLD',
      'RESERVATION',
      'ALLOCATION',
      'CONSUMPTION',
      'RELEASE',
      'ADJUSTMENT',
    ],
  })
  @IsOptional()
  @IsIn([
    'RECEIPT',
    'HOLD',
    'RESERVATION',
    'ALLOCATION',
    'CONSUMPTION',
    'RELEASE',
    'ADJUSTMENT',
  ])
  movementType?: string;

  @ApiPropertyOptional({
    description: 'Maximum records to return',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Records offset',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

// -----------------------------------------------------------------------------
// [INVEN-013] Adjust Inventory Body
// -----------------------------------------------------------------------------
export class AdjustInventoryBodyDto {
  @ApiProperty({
    description: 'Target stock lot ID to adjust',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsUUID()
  stockLotId!: string;

  @ApiProperty({
    description:
      'Quantity difference to apply (positive to increase, negative to decrease)',
    example: -2,
  })
  @Type(() => Number)
  @IsInt()
  adjustedQuantity!: number;

  @ApiProperty({
    description: 'Mandatory reason for stock discrepancy / adjustment',
    example: 'Báo cáo hao hụt kiểm kê định kỳ tháng 11',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Additional adjustment context metadata',
    example: { auditSessionId: 'AUD-20261114-01' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
