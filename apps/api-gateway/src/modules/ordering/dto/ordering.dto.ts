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
