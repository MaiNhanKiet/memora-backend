import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentReceiptDetailDto {
  @ApiProperty({ example: 'REC-ORD-123-P1-A1' })
  receiptNo!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  transactionId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'ORD-20261115-A1B2' })
  orderNo!: string;

  @ApiProperty({ example: 'P1' })
  paymentStage!: string;

  @ApiProperty({ example: 4500000 })
  amount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 'PAYOS' })
  paymentMethod!: string;

  @ApiProperty({ example: '2026-11-15T04:05:00.000Z' })
  completedAt!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  recipientName!: string;

  @ApiProperty({ example: '2026-11-15T04:05:00.000Z' })
  issuedAt!: string;
}

export class InvoiceItemSummaryDto {
  @ApiProperty({ example: 'GOLD_MATERIAL' })
  componentType!: string;

  @ApiProperty({ example: '18K White Gold Setting 4.2g' })
  description!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 8500000 })
  unitAmount!: number;

  @ApiProperty({ example: 8500000 })
  lineAmount!: number;
}

export class InvoicePaymentRecordDto {
  @ApiProperty({ example: 'P1' })
  paymentStage!: string;

  @ApiProperty({ example: 4500000 })
  amount!: number;

  @ApiProperty({ example: '2026-11-15T04:05:00.000Z' })
  completedAt!: string;

  @ApiPropertyOptional({ example: 'REC-ORD-123-P1-A1' })
  receiptNo?: string;
}

export class OrderInvoiceDetailDto {
  @ApiProperty({ example: 'INV-ORD-20261115-A1B2' })
  invoiceNo!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'ORD-20261115-A1B2' })
  orderNo!: string;

  @ApiProperty({ example: 'AWAITING_CUSTOMER_CONFIRMATION' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T09:00:00.000Z' })
  issuedAt!: string;

  @ApiProperty({ example: 15000000 })
  totalAmount!: number;

  @ApiProperty({ example: 4500000 })
  totalPaidAmount!: number;

  @ApiProperty({ example: 10500000 })
  remainingAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  recipientName!: string;

  @ApiPropertyOptional({ example: '0901234567' })
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: '{"street":"123 Le Loi","city":"Ho Chi Minh"}',
  })
  deliveryAddressJson?: string;

  @ApiProperty({ type: [InvoiceItemSummaryDto] })
  items!: InvoiceItemSummaryDto[];

  @ApiProperty({ type: [InvoicePaymentRecordDto] })
  paymentTransactions!: InvoicePaymentRecordDto[];
}
