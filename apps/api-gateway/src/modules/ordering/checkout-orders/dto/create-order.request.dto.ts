import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
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
    example: 'nguyenvana@example.com',
  })
  @IsEmail()
  recipientEmail!: string;

  @ApiPropertyOptional({
    description: 'Delivery address if fulfillment mode is DELIVERY',
    type: DeliveryAddressDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  @ApiPropertyOptional({
    description: 'Source plan mode (SINGLE or COUPLE)',
    example: 'SINGLE',
    default: 'SINGLE',
  })
  @IsOptional()
  @IsString()
  sourcePlanMode?: string;

  @ApiPropertyOptional({
    description:
      'Required acknowledgement if order contains soundwave or biometric items',
    type: PreP1AcknowledgementDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PreP1AcknowledgementDto)
  preP1Acknowledgement?: PreP1AcknowledgementDto;
}
