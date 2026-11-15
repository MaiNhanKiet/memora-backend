import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreP1AcknowledgementDto {
  @ApiProperty({
    description: 'Version of privacy policy / terms acknowledged',
    example: 'v1.0',
  })
  @IsString()
  @IsNotEmpty()
  noticeVersion!: string;

  @ApiProperty({
    description:
      'Customer acknowledges understanding biometric/soundwave data processing terms',
    example: true,
  })
  @IsBoolean()
  privacyNoticeAcknowledged!: boolean;

  @ApiProperty({
    description:
      'Customer acknowledges understanding that refusing to sign consent form after deposit does not grant automatic refund of P1 deposit',
    example: true,
  })
  @IsBoolean()
  p1NonrefundAcknowledged!: boolean;
}

export class DeliveryAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Le Loi' })
  @IsString()
  @IsNotEmpty()
  street!: string;

  @ApiPropertyOptional({ description: 'Ward', example: 'Ben Nghe' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ description: 'District', example: 'District 1' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({ description: 'City/Province', example: 'Ho Chi Minh' })
  @IsString()
  @IsNotEmpty()
  city!: string;
}

export class CreateOrderBodyDto {
  @ApiProperty({
    description: 'Array of 1 to 2 draft UUIDs selected from cart',
    example: ['d1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsUUID('4', { each: true })
  selectedDraftIds!: string[];

  @ApiPropertyOptional({
    description: 'Fulfillment mode (DELIVERY or PICKUP)',
    example: 'DELIVERY',
    default: 'DELIVERY',
  })
  @IsOptional()
  @IsString()
  fulfillmentMode?: string;

  @ApiProperty({
    description: 'Recipient full name',
    example: 'Nguyen Van A',
  })
  @IsString()
  @IsNotEmpty()
  recipientName!: string;

  @ApiProperty({
    description: 'Recipient contact phone number',
    example: '0901234567',
  })
  @IsString()
  @IsNotEmpty()
  recipientPhone!: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'customer@example.com',
  })
  @IsEmail()
  recipientEmail!: string;

  @ApiProperty({
    description: 'Delivery address details',
    type: DeliveryAddressDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;

  @ApiPropertyOptional({
    description:
      'Source plan mode (SHARED or SEPARATE) for pair orders sharing personalization',
    example: 'N/A',
  })
  @IsOptional()
  @IsString()
  sourcePlanMode?: string;

  @ApiPropertyOptional({
    description:
      'Pre-P1 consent acknowledgment (mandatory for orders with FINGERPRINT or SOUNDWAVE)',
    type: PreP1AcknowledgementDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreP1AcknowledgementDto)
  preP1Acknowledgement?: PreP1AcknowledgementDto;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Page index (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page item count limit',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    example: 'AWAITING_P1',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class ListAdminOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Page index (1-based)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page item count limit',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by order status',
    example: 'AWAITING_P1',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Search by order number or recipient info',
    example: 'ORD-173158',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders created on or after this ISO date',
    example: '2026-11-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter orders created on or before this ISO date',
    example: '2026-11-30T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

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

export class ListAdminOrdersResponseDto {
  @ApiProperty({ type: [AdminOrderSummaryDto] })
  items!: AdminOrderSummaryDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
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

// -----------------------------------------------------------------------------
// Ring Item Versions & Quotes DTOs
// -----------------------------------------------------------------------------

export class RingItemGemstoneInputDto {
  @ApiProperty({ description: 'Slot number on ring', example: 1 })
  @IsInt()
  @Min(1)
  slotNumber!: number;

  @ApiProperty({
    description: 'Gemstone option UUID',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsUUID('4')
  gemstoneOptionId!: string;
}

export class UpdateCurrentRingItemVersionBodyDto {
  @ApiPropertyOptional({
    description: 'Adjusted target finger size',
    example: 14.5,
  })
  @IsOptional()
  @Type(() => Number)
  targetSize?: number;

  @ApiPropertyOptional({
    description: 'Reason for design adjustment',
    example: 'Customer requested resize before production lock',
  })
  @IsOptional()
  @IsString()
  changeReason?: string;

  @ApiPropertyOptional({
    description: 'Toggle smart memory capsule feature',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  memoryEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Updated gemstone selections',
    type: [RingItemGemstoneInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RingItemGemstoneInputDto)
  gemstoneSelections?: RingItemGemstoneInputDto[];
}

export class RingItemVersionSummaryDto {
  @ApiProperty({ example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ example: 'DRAFT' })
  status!: string;

  @ApiProperty({ example: 14.0 })
  targetSize!: number;

  @ApiProperty({ example: 'SOUNDWAVE' })
  personalizationPackage!: string;

  @ApiProperty({ example: true })
  memoryEnabled!: boolean;

  @ApiPropertyOptional({ example: 'Initial draft' })
  changeReason?: string;

  @ApiProperty({ example: 'tv1-uuid' })
  templateVariantId!: string;

  @ApiProperty({ example: 'T01' })
  templateCode!: string;

  @ApiProperty({ example: 'Classic Ring' })
  templateName!: string;

  @ApiProperty({ example: 'Yellow Gold 18K' })
  materialName!: string;

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;
}

export class ListRingItemVersionsResponseDto {
  @ApiProperty({ example: 'item-uuid' })
  ringItemId!: string;

  @ApiProperty({ example: 'ord-uuid' })
  orderId!: string;

  @ApiProperty({ type: [RingItemVersionSummaryDto] })
  versions!: RingItemVersionSummaryDto[];
}

export class UpdateCurrentRingItemVersionResponseDto {
  @ApiProperty({ example: 'item-uuid' })
  ringItemId!: string;

  @ApiProperty({ example: 'ver-uuid' })
  versionId!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ example: 'DRAFT' })
  status!: string;

  @ApiProperty({ example: 14.5 })
  targetSize!: number;

  @ApiPropertyOptional({ example: 'Customer resize request' })
  changeReason?: string;

  @ApiProperty({ example: '2026-11-14T11:00:00.000Z' })
  updatedAt!: string;
}

export class QuoteLineItemDto {
  @ApiProperty({ example: 'item-uuid' })
  id!: string;

  @ApiProperty({ example: 'RING_BLANK' })
  componentType!: string;

  @ApiPropertyOptional({ example: '18K Gold Setting' })
  description?: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 12000000 })
  unitAmount!: number;

  @ApiProperty({ example: 12000000 })
  lineAmount!: number;

  @ApiProperty({ example: 'CATALOG_BASE' })
  priceSourceType!: string;
}

export class FullQuoteDetailDto {
  @ApiProperty({ example: 'quo-uuid' })
  id!: string;

  @ApiProperty({ example: 'QUO-1731580000000-ABCD' })
  quoteNo!: string;

  @ApiProperty({ example: 'PROVISIONAL' })
  quoteType!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;

  @ApiProperty({ example: 'ISSUED' })
  status!: string;

  @ApiProperty({ example: 15500000 })
  subtotalAmount!: number;

  @ApiProperty({ example: 0 })
  deliveryAmount!: number;

  @ApiProperty({ example: 0 })
  adjustmentAmount!: number;

  @ApiProperty({ example: 15500000 })
  totalAmount!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ type: [QuoteLineItemDto] })
  items!: QuoteLineItemDto[];

  @ApiProperty({ example: '2026-11-14T10:00:00.000Z' })
  createdAt!: string;
}

export class ListOrderQuotesResponseDto {
  @ApiProperty({ example: 'ord-uuid' })
  orderId!: string;

  @ApiProperty({ type: [FullQuoteDetailDto] })
  quotes!: FullQuoteDetailDto[];
}

export class CancelOrderBodyDto {
  @ApiPropertyOptional({
    description: 'Reason for cancellation',
    example: 'Changed my mind about design specifications',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelOrderResponseDto {
  @ApiProperty({ example: 'order-uuid' })
  orderId!: string;

  @ApiProperty({ example: 'CANCELLED' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T07:00:00.000Z' })
  cancelledAt!: string;

  @ApiPropertyOptional({ example: 'Changed my mind' })
  cancellationReason?: string;
}

export class CreateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  ringItemId?: string;

  @ApiProperty({ example: 'GOLD_MATERIAL' })
  @IsString()
  @IsNotEmpty()
  componentType!: string;

  @ApiPropertyOptional({ example: '18K White Gold Setting 4.2g' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  unitAmount!: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  lineAmount!: number;

  @ApiPropertyOptional({ example: 'CATALOG_RULE', default: 'MANUAL' })
  @IsOptional()
  @IsString()
  priceSourceType?: string;
}

export class CreateFinalQuoteBodyDto {
  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @Type(() => Number)
  subtotalAmount?: number;

  @ApiPropertyOptional({ example: 50000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  deliveryAmount?: number;

  @ApiPropertyOptional({ example: -500000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  adjustmentAmount?: number;

  @ApiProperty({ example: 14550000 })
  @Type(() => Number)
  totalAmount!: number;

  @ApiPropertyOptional({ example: 'VND', default: 'VND' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-11-22T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiProperty({ type: [CreateQuoteLineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  items!: CreateQuoteLineItemDto[];
}

export class UpdateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @ApiPropertyOptional({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  @IsOptional()
  @IsUUID('4')
  ringItemId?: string;

  @ApiProperty({ example: 'GOLD_MATERIAL' })
  @IsString()
  @IsNotEmpty()
  componentType!: string;

  @ApiPropertyOptional({ example: '18K White Gold Setting 4.2g' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  unitAmount!: number;

  @ApiProperty({ example: 8500000 })
  @Type(() => Number)
  lineAmount!: number;

  @ApiPropertyOptional({ example: 'MANUAL' })
  @IsOptional()
  @IsString()
  priceSourceType?: string;
}

export class UpdateFinalQuoteBodyDto {
  @ApiPropertyOptional({ example: 15000000 })
  @IsOptional()
  @Type(() => Number)
  subtotalAmount?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @Type(() => Number)
  deliveryAmount?: number;

  @ApiPropertyOptional({ example: -500000 })
  @IsOptional()
  @Type(() => Number)
  adjustmentAmount?: number;

  @ApiPropertyOptional({ example: 14550000 })
  @IsOptional()
  @Type(() => Number)
  totalAmount?: number;

  @ApiPropertyOptional({ example: '2026-11-22T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ type: [UpdateQuoteLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuoteLineItemDto)
  items?: UpdateQuoteLineItemDto[];
}

export class ConfirmFinalQuoteBodyDto {
  @ApiPropertyOptional({
    description:
      'Specific quote UUID to confirm (defaults to order current_quote_id if omitted)',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  quoteId?: string;

  @ApiPropertyOptional({
    description: 'Customer notes',
    example: 'Ready to proceed with fabrication',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinalConfirmationItemSummaryDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringItemId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  ringItemVersionId!: string;

  @ApiProperty({ example: 1 })
  versionNo!: number;
}

export class ConfirmFinalQuoteResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  confirmationId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  confirmedAt!: string;

  @ApiProperty({ example: 'AWAITING_P2' })
  nextOrderStatus!: string;

  @ApiProperty({ type: [FinalConfirmationItemSummaryDto] })
  items!: FinalConfirmationItemSummaryDto[];
}

export class RejectFinalQuoteBodyDto {
  @ApiPropertyOptional({
    description:
      'Quote UUID being rejected (defaults to current_quote_id if omitted)',
    example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
  })
  @IsOptional()
  @IsUUID('4')
  quoteId?: string;

  @ApiProperty({
    description: 'Reason for rejecting the final quote',
    example:
      'Diamond price is higher than discussed, request replacement gemstone',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class RejectFinalQuoteResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'REJECTED' })
  status!: string;

  @ApiProperty({ example: 'Diamond price is higher than discussed' })
  reason!: string;

  @ApiProperty({ example: 'PENDING_FINAL_QUOTE' })
  updatedOrderStatus!: string;
}

export class FinalConfirmationDetailDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  quoteId!: string;

  @ApiProperty({ example: 'QUO-ORD-123-F1' })
  quoteNo!: string;

  @ApiProperty({ example: 14500000 })
  quoteTotalAmount!: number;

  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  confirmedByCustomerIdentityId!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
  confirmedAt!: string;

  @ApiPropertyOptional({ example: '2026-11-15T09:00:00.000Z' })
  invalidatedAt?: string;

  @ApiPropertyOptional({ example: 'Superseded by new confirmation' })
  invalidationReason?: string;

  @ApiProperty({ type: [FinalConfirmationItemSummaryDto] })
  items!: FinalConfirmationItemSummaryDto[];
}

export class GetFinalConfirmationsResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  orderId!: string;

  @ApiProperty({ type: [FinalConfirmationDetailDto] })
  confirmations!: FinalConfirmationDetailDto[];
}

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

  @ApiProperty({ example: 'PENDING' })
  status!: string;

  @ApiProperty({ example: '2026-11-15T10:00:00.000Z' })
  requestedAt!: string;

  @ApiProperty({ example: 'Customer cancellation' })
  reason!: string;
}
