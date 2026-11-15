import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { CAPTURE_MAX_ATTEMPTS } from '@app/contracts';

export class CompleteCaptureSessionRequestDto {
  @ApiProperty({
    description:
      'The PENDING_REVIEW attempt the staff accepts after viewing its image',
    example: 1,
    minimum: 1,
    maximum: CAPTURE_MAX_ATTEMPTS,
  })
  @IsInt()
  @Min(1)
  @Max(CAPTURE_MAX_ATTEMPTS)
  attemptNo!: number;
}
