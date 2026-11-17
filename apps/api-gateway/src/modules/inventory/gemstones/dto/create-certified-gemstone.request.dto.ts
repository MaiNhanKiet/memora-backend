import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCertifiedGemstoneBodyDto {
  @ApiProperty({
    description: 'Unique internal inventory tracking code',
    example: 'CERT-DIA-GIA-992182',
    maxLength: 80,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  internalCode!: string;

  @ApiProperty({
    description: 'Gemstone option ID matching specifications',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsUUID()
  gemstoneOptionId!: string;

  @ApiPropertyOptional({
    description: 'Certification institute (GIA, IGI, HRD, etc.)',
    example: 'GIA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  certificateProvider?: string;

  @ApiPropertyOptional({
    description: 'Official certificate report number',
    example: 'GIA-2219482910',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  certificateNumber?: string;

  @ApiPropertyOptional({
    description: 'Digital certificate report URL',
    example: 'https://www.gia.edu/report-check?reportno=2219482910',
  })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional({
    description:
      'Detailed certificate metadata (cut, clarity, color, carat, proportions)',
    example: { cut: 'EXCELLENT', clarity: 'VVS1', color: 'D', carat: 1.02 },
  })
  @IsOptional()
  @IsObject()
  certificateMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Purchase cost in VND',
    example: 65000000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchaseCost?: number;

  @ApiPropertyOptional({
    description: 'Vault location code',
    example: 'SAFE-01-SLOT-12',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  locationCode?: string;
}
