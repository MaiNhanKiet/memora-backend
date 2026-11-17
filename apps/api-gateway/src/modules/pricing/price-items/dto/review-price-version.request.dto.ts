import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApprovePriceVersionBodyDto {
  @ApiPropertyOptional({
    description: 'Approval review notes',
    example: 'Approved based on updated gold spot price',
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}

export class RejectPriceVersionBodyDto {
  @ApiPropertyOptional({
    description: 'Rejection reason',
    example: 'Price too low compared to market floor',
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
