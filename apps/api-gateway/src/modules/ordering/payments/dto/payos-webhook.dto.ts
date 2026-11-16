import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PayosWebhookBodyDto {
  @ApiProperty({ description: 'Response code from PayOS', example: '00' })
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Description', example: 'success' })
  @IsNotEmpty()
  desc!: string;

  @ApiProperty({ description: 'Success flag', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Webhook data object containing orderCode, amount, reference' })
  @IsNotEmpty()
  data!: any;

  @ApiProperty({ description: 'HMAC_SHA256 signature for verification' })
  @IsNotEmpty()
  signature!: string;
}

export class PayosWebhookResponseDto {
  @ApiProperty({ description: 'Result flag', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Message', example: 'Payment processed successfully' })
  message!: string;

  @ApiPropertyOptional({ description: 'Transaction UUID' })
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Updated transaction status', example: 'SUCCEEDED' })
  status?: string;
}
