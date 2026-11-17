import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
