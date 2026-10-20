import { ApiProperty } from '@nestjs/swagger';

export class SecurityAuditEventResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  outcome!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  metadata!: Record<string, string>;
}
