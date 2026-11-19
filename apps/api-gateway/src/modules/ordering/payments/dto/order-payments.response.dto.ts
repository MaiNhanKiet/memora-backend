import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentTransactionSummaryDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'P1' })
  paymentStage!: string;

  @ApiProperty({ example: 'PAYMENT' })
  transactionType!: string;

  @ApiProperty({ example: 4500000 })
  amount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 'SUCCEEDED' })
  status!: string;

  @ApiPropertyOptional({ example: 'PAYOS' })
  provider?: string;

  @ApiPropertyOptional({ example: 'PAYOS' })
  paymentMethod?: string;

  @ApiProperty({ example: '2026-11-15T04:00:00.000Z' })
  requestedAt!: string;

  @ApiPropertyOptional({ example: '2026-11-15T04:05:00.000Z' })
  completedAt?: string;

  @ApiPropertyOptional({ example: 'REC-ORD-123-P1-A1' })
  receiptNo?: string;
}

export class ListOrderPaymentsResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 15000000 })
  totalPaidAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ type: [PaymentTransactionSummaryDto] })
  payments!: PaymentTransactionSummaryDto[];
}

export class PaymentTransactionDetailDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'P1' })
  paymentStage!: string;

  @ApiProperty({ example: 'PAYMENT' })
  transactionType!: string;

  @ApiProperty({ example: 4500000 })
  amount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 'SUCCEEDED' })
  status!: string;

  @ApiPropertyOptional({ example: 'PAYOS' })
  provider?: string;

  @ApiPropertyOptional({ example: 'PAYOS' })
  paymentMethod?: string;

  @ApiPropertyOptional({ example: '123456789' })
  providerOrderCode?: string;

  @ApiPropertyOptional({ example: 'payos-tx-123' })
  providerTransactionId?: string;

  @ApiPropertyOptional({ example: 'ref-123' })
  providerReference?: string;

  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  relatedTransactionId?: string;

  @ApiProperty({ example: '2026-11-15T04:00:00.000Z' })
  requestedAt!: string;

  @ApiPropertyOptional({ example: '2026-11-15T04:05:00.000Z' })
  completedAt?: string;

  @ApiPropertyOptional({ example: '2026-11-15T04:05:00.000Z' })
  failedAt?: string;

  @ApiPropertyOptional({ example: 'User cancelled payment' })
  failureReason?: string;

  @ApiPropertyOptional({ example: 'REC-ORD-123-P1-A1' })
  receiptNo?: string;

  @ApiPropertyOptional({ example: '2026-11-15T04:05:00.000Z' })
  receiptIssuedAt?: string;
}
