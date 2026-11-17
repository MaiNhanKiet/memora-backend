import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRefundRequestBodyDto {
  @ApiProperty({ example: 4500000 })
  @Type(() => Number)
  refundAmount!: number;

  @ApiProperty({
    example: 'Customer requested order cancellation before machining stage',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({ example: 'Approved by Store Manager' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRefundResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  refundTransactionId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  originalTransactionId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 4500000 })
  refundAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 'SUCCEEDED' })
  status!: string;
}
