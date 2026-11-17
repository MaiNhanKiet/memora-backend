import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class PayosWebhookBodyDto {
  @ApiPropertyOptional({ description: 'Response code from PayOS', example: '00' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Description', example: 'success' })
  @IsOptional()
  @IsString()
  desc?: string;

  @ApiPropertyOptional({ description: 'Success flag', example: true })
  @IsOptional()
  @IsBoolean()
  success?: boolean;

  @ApiPropertyOptional({
    description: 'Webhook data object containing orderCode, amount, reference',
  })
  @IsOptional()
  data?: Record<string, unknown> | string;

  @ApiPropertyOptional({ description: 'HMAC_SHA256 signature for verification' })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({ description: 'Webhook test URL from PayOS confirmation' })
  @IsOptional()
  @IsString()
  webhookUrl?: string;
}

export class PayosWebhookResponseDto {
  @ApiProperty({ description: 'Result flag', example: true })
  success!: boolean;

  @ApiProperty({
    description: 'Message',
    example: 'Payment processed successfully',
  })
  message!: string;

  @ApiPropertyOptional({ description: 'Transaction UUID' })
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Updated transaction status',
    example: 'SUCCEEDED',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Associated Order UUID',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  orderId?: string;
}
