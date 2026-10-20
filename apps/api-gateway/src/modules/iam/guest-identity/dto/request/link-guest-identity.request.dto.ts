import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LinkGuestIdentityRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  guestProof!: string;
}
