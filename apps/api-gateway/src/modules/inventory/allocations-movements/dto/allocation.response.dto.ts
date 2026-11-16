import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AllocationResponseDto {
  @ApiProperty({ example: '66666666-6666-6666-6666-666666666666' })
  id!: string;

  @ApiProperty({ example: '77777777-7777-7777-7777-777777777777' })
  ringItemId!: string;

  @ApiPropertyOptional({ example: '11111111-1111-1111-1111-111111111111' })
  stockLotId?: string;

  @ApiPropertyOptional({ example: '44444444-4444-4444-4444-444444444444' })
  certifiedGemstoneId?: string;

  @ApiProperty({
    enum: ['HOLD', 'RESERVED', 'ALLOCATED', 'CONSUMED', 'RELEASED'],
    example: 'HOLD',
  })
  status!: string;

  @ApiProperty({ example: 1 })
  allocatedQuantity!: number;

  @ApiPropertyOptional({ example: '2026-11-14T09:00:00.000Z' })
  holdExpiresAt?: string;

  @ApiPropertyOptional({ example: '88888888-8888-8888-8888-888888888888' })
  productionAttemptId?: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T08:00:00.000Z' })
  updatedAt!: string;
}
