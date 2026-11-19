import { ApiProperty } from '@nestjs/swagger';
import { CartItemDraftDto } from '../../cart/dto';

export class GetDesignDraftResponseDto {
  @ApiProperty({ type: CartItemDraftDto })
  draft!: CartItemDraftDto;
}

export class DuplicateDesignDraftResponseDto {
  @ApiProperty({ type: CartItemDraftDto })
  draft!: CartItemDraftDto;

  @ApiProperty({ example: 2 })
  itemsCount!: number;

  @ApiProperty({ example: 31000000 })
  totalEstimatedPrice!: number;

  @ApiProperty({ example: 'VND' })
  currency!: string;
}
