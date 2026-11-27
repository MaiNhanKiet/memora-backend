import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';

export class AdminOrderSummaryDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'ORD-1731580000000-ABCD' })
  orderNo!: string;

  @ApiProperty({ example: 'AWAITING_P1' })
  status!: string;

  @ApiProperty({ example: 'N/A' })
  sourcePlanMode!: string;

  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ownerCustomerIdentityId!: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  recipientName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  recipientEmail?: string;

  @ApiProperty({ example: 1 })
  itemsCount!: number;

  @ApiProperty({ example: 15500000 })
  totalAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  updatedAt!: string;
}

export class AdminCustomerInfoDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  customerIdentityId!: string;

  @ApiPropertyOptional({ example: 'guest@example.com' })
  guestEmail?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  guestPhone?: string;

  @ApiPropertyOptional({ example: '2026-11-14T10:00:00.000Z' })
  guestEmailVerifiedAt?: string;
}

export class AdminOrderDetailsResponseDto {
  @ApiPropertyOptional({
    enum: ['CERTIFIED_GEMSTONE_RESERVATION_REQUIRED'],
    description:
      'P1 is fully paid and staff must resolve the certified gemstone reservation.',
  })
  attentionReason?: 'CERTIFIED_GEMSTONE_RESERVATION_REQUIRED';

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'ORD-1731580000000-ABCD' })
  orderNo!: string;

  @ApiProperty({ example: 'AWAITING_P1' })
  status!: string;

  @ApiProperty({ example: 'N/A' })
  sourcePlanMode!: string;

  @ApiPropertyOptional({ example: 'DELIVERY' })
  fulfillmentMode?: string;

  @ApiProperty({ type: AdminCustomerInfoDto })
  customer!: AdminCustomerInfoDto;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  recipientName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  recipientPhone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  recipientEmail?: string;

  @ApiPropertyOptional({
    example: '{"street":"123 Le Loi","city":"Ho Chi Minh"}',
  })
  deliveryAddressJson?: string;

  @ApiPropertyOptional({ example: '{"privacyNoticeAcknowledged":true}' })
  preP1EvidenceJson?: string;

  @ApiPropertyOptional({ example: null })
  cancelledAt?: string;

  @ApiPropertyOptional({ example: null })
  cancellationReason?: string;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  updatedAt!: string;
}

export class PendingOrderPaymentDto {
  @ApiProperty()
  transactionId!: string;

  @ApiPropertyOptional()
  expiresAt?: string;
}

export class OrderNextPaymentDto {
  @ApiProperty({ example: 'MILESTONE_P2' })
  stage!: string;

  @ApiProperty()
  amountDue!: number;

  @ApiProperty()
  paidAmount!: number;

  @ApiProperty()
  orderTotal!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty()
  canPay!: boolean;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ type: PendingOrderPaymentDto })
  pendingAttempt?: PendingOrderPaymentDto;
}

export class OrderDetailsResponseDto extends PickType(
  AdminOrderDetailsResponseDto,
  [
    'id',
    'orderNo',
    'status',
    'sourcePlanMode',
    'fulfillmentMode',
    'recipientName',
    'recipientPhone',
    'recipientEmail',
    'deliveryAddressJson',
    'createdAt',
    'updatedAt',
  ] as const,
) {
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  currentQuote?: Record<string, unknown>;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  items!: Record<string, unknown>[];

  @ApiPropertyOptional({ type: OrderNextPaymentDto })
  nextPayment?: OrderNextPaymentDto;
}
