import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class LinkGoogleAccountRequestDto {
  @ApiPropertyOptional({
    minLength: 8,
    maxLength: 128,
    example: 'CurrentPassword1!',
    description: 'Current MEMORA password. Send this to start linking.',
  })
  @ValidateIf(
    (dto: LinkGoogleAccountRequestDto) => dto.confirmationId === undefined,
  )
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({
    minLength: 20,
    maxLength: 128,
    example: 'paste-confirmation-id-from-redirect',
    description:
      'Confirmation id from the redirect. Send this when the Google email differs.',
  })
  @ValidateIf((dto: LinkGoogleAccountRequestDto) => dto.password === undefined)
  @IsString()
  @MinLength(20)
  @MaxLength(128)
  confirmationId?: string;
}
