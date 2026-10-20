import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateMyProfileRequestDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 150 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({
    nullable: true,
    maxLength: 30,
    description: 'Omit to keep the current phone. Null clears it.',
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsPhoneNumber('VN')
  @MaxLength(30)
  phone?: string | null;
}
