import { ApiProperty } from '@nestjs/swagger';

export class RegisterChallengeResponseDto {
  @ApiProperty({
    example: 300,
    description: 'Seconds until the emailed registration code expires',
  })
  expiresInSeconds!: number;
}
