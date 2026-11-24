import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GemstoneSelectionDto } from './add-cart-item.request.dto';

export class CartItemDraftDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  draftId!: string;

  @ApiProperty({ example: 'v1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  templateVariantId!: string;

  @ApiProperty({ example: 'RT-CLASSIC-01' })
  templateCode!: string;

  @ApiProperty({ example: 'Classic Solitaire' })
  templateName!: string;

  @ApiProperty({ example: 'Yellow Gold 18K' })
  materialName!: string;

  @ApiProperty({ example: 12.0 })
  standardSize!: number;

  @ApiProperty({ example: 13.0 })
  targetSize!: number;

  @ApiProperty({ example: 'SOUNDWAVE' })
  personalizationPackage!: string;

  @ApiProperty({ example: true })
  memoryEnabled!: boolean;

  @ApiPropertyOptional({ example: 'LIFETIME_POLISHING' })
  maintenancePlan?: string;

  @ApiProperty({ type: [GemstoneSelectionDto] })
  gemstoneSelections!: GemstoneSelectionDto[];

  @ApiProperty({ example: 15500000 })
  estimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ example: '2026-11-14T03:30:00.000Z' })
  estimatedPriceAt!: string;

  @ApiProperty({ example: 'IN_CART' })
  status!: string;

  @ApiProperty({ example: '2026-11-14T03:30:00.000Z' })
  createdAt!: string;
}

export class CartResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  id!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 1 })
  itemsCount!: number;

  @ApiProperty({ example: 15500000 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiPropertyOptional({ example: '2026-11-21T03:30:00.000Z' })
  expiresAt?: string;

  @ApiProperty({ type: [CartItemDraftDto] })
  items!: CartItemDraftDto[];
}

export class AddCartItemResponseDto {
  @ApiProperty({ type: CartItemDraftDto })
  item!: CartItemDraftDto;

  @ApiProperty({ example: 1 })
  itemsCount!: number;

  @ApiProperty({ example: 15500000 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;
}

export class UpdateCartItemResponseDto {
  @ApiProperty({ type: CartItemDraftDto })
  item!: CartItemDraftDto;

  @ApiProperty({ example: 15500000 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;
}

export class RemoveCartItemResponseDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  removedDraftId!: string;

  @ApiProperty({ example: 0 })
  itemsCount!: number;

  @ApiProperty({ example: 0 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;
}

export class CheckoutValidationIssueDto {
  @ApiProperty({ example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  draftId!: string;

  @ApiProperty({ example: 'REPRICING_FAILED' })
  code!: string;

  @ApiProperty({ example: 'Gemstone option out of stock or price changed' })
  message!: string;
}

export class ValidateCheckoutResponseDto {
  @ApiProperty({ example: true })
  isValid!: boolean;

  @ApiProperty({ example: 15500000 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;

  @ApiProperty({ type: [CheckoutValidationIssueDto] })
  issues!: CheckoutValidationIssueDto[];
}

export class AbandonCartResponseDto {
  @ApiProperty({ example: 'c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c' })
  cartId!: string;

  @ApiProperty({ example: 'ABANDONED' })
  status!: string;
}
