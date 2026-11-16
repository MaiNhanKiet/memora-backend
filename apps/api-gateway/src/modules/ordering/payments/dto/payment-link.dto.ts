import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateOrderPaymentLinkBodyDto {
  @ApiPropertyOptional({
    description: 'Payment stage: DEPOSIT_P1, MILESTONE_P2, FINAL_P3, FULL_PAYMENT',
    example: 'DEPOSIT_P1',
  })
  @IsOptional()
  @IsString()
  paymentStage?: string;

  @ApiPropertyOptional({
    description: 'Client return URL on successful redirect',
    example: 'https://memora.vn/orders/order-123/success',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @ApiPropertyOptional({
    description: 'Client cancel URL on cancellation',
    example: 'https://memora.vn/orders/order-123/cancel',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}

export class PaymentLinkResponseDto {
  @ApiProperty({ description: 'Payment Transaction UUID' })
  transactionId!: string;

  @ApiProperty({ description: 'Unique integer orderCode for PayOS', example: 1715001234 })
  orderCode!: number | string;

  @ApiProperty({ description: 'Hosted PayOS Checkout Web URL', example: 'https://pay.payos.vn/web/pl_123' })
  checkoutUrl!: string;

  @ApiProperty({ description: 'Raw VietQR string to render barcode/QR code' })
  qrCode!: string;

  @ApiProperty({ description: 'Payment amount in VND', example: 4500000 })
  amount!: number;

  @ApiProperty({ description: 'Currency', example: 'VND' })
  currency!: string;

  @ApiProperty({ description: 'Stage code: DEPOSIT_P1, MILESTONE_P2, FINAL_P3, SERVICE_FEE', example: 'DEPOSIT_P1' })
  paymentStage!: string;

  @ApiProperty({ description: 'Transaction status', example: 'PENDING' })
  status!: string;

  @ApiPropertyOptional({ description: 'Expiration ISO string' })
  expiresAt?: string;
}
