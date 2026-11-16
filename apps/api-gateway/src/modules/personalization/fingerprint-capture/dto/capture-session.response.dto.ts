import { ApiProperty } from '@nestjs/swagger';
import {
  CAPTURE_ATTEMPT_RESULTS,
  CAPTURE_SUGGESTIONS,
  CAPTURE_MAX_ATTEMPTS,
  CAPTURE_SESSION_STATUSES,
} from '@app/contracts';

export class CaptureAttemptResponseDto {
  @ApiProperty({ example: 1 })
  attemptNo!: number;

  @ApiProperty({
    enum: CAPTURE_ATTEMPT_RESULTS,
    description:
      'PENDING_REVIEW waits for the staff to reject it or complete the session with this attemptNo',
  })
  result!: string;

  @ApiProperty({ nullable: true, type: Number })
  qualityScore!: number | null;

  @ApiProperty({ format: 'date-time' })
  attemptedAt!: string;

  @ApiProperty({
    enum: CAPTURE_SUGGESTIONS,
    nullable: true,
    type: String,
    description:
      'Quality threshold suggestion only; the staff decides. Null when absent',
  })
  suggestion!: string | null;
}

export class CaptureSessionResponseDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ format: 'uuid' })
  orderId!: string;

  @ApiProperty({ format: 'uuid' })
  consentId!: string;

  @ApiProperty({ example: 'store-hcm-01' })
  deviceCode!: string;

  @ApiProperty({ enum: CAPTURE_SESSION_STATUSES })
  status!: string;

  @ApiProperty({ example: 0 })
  attemptCount!: number;

  @ApiProperty({ example: CAPTURE_MAX_ATTEMPTS })
  maxAttempts!: number;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'Set once the session is COMPLETED',
  })
  acceptedSourceId!: string | null;

  @ApiProperty({ type: [CaptureAttemptResponseDto] })
  attempts!: CaptureAttemptResponseDto[];
}
