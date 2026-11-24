import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelOrderBodyDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Changed my mind before deposit',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelOrderResponseDto {
  @ApiProperty({ description: 'Order UUID' })
  orderId!: string;

  @ApiProperty({ description: 'Updated order status', example: 'CANCELLED' })
  status!: string;

  @ApiPropertyOptional({ description: 'Cancellation reason' })
  cancellationReason?: string;
}
