import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrderStatusBodyDto {
  @ApiProperty({
    description:
      'Target status (e.g. PENDING_FINAL_QUOTE, AWAITING_CUSTOMER_CONFIRMATION, CANCELLED)',
    example: 'CANCELLED',
  })
  @IsString()
  @IsNotEmpty()
  targetStatus!: string;

  @ApiPropertyOptional({
    description: 'Reason for status update / cancellation',
    example: 'Customer requested cancellation via phone call',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateOrderStatusResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'ORD-1731580000000-ABCD' })
  orderNo!: string;

  @ApiProperty({ example: 'AWAITING_P1' })
  previousStatus!: string;

  @ApiProperty({ example: 'CANCELLED' })
  currentStatus!: string;

  @ApiProperty({ example: '2026-11-14T11:00:00.000Z' })
  updatedAt!: string;
}
