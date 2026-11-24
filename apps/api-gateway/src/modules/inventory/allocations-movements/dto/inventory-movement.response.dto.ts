import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
