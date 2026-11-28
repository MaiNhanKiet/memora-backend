import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogItemDto {
  @ApiProperty({
    description: 'Định danh bản ghi kiểm toán',
    example: '11111111-1111-4111-8111-111111111111',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'ID người dùng thực hiện',
    example: '22222222-2222-4222-8222-222222222222',
  })
  actorUserId?: string;

  @ApiProperty({
    description: 'Mã hành vi kiểm toán',
    example: 'USER_ROLE_ASSIGNED',
  })
  action!: string;

  @ApiProperty({
    description: 'Loại thực thể chịu tác động',
    example: 'USER',
  })
  entityType!: string;

  @ApiPropertyOptional({
    description: 'ID của thực thể',
    example: '33333333-3333-4333-8333-333333333333',
  })
  entityId?: string;

  @ApiPropertyOptional({
    description: 'ID request truy vết',
    example: 'req-xyz-123',
  })
  requestId?: string;

  @ApiPropertyOptional({
    description: 'ID trace phân tán',
    example: 'trace-abc-456',
  })
  traceId?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái kết quả',
    example: 'SUCCESS',
  })
  resultStatus?: string;

  @ApiPropertyOptional({
    description: 'Chi tiết thay đổi dữ liệu',
  })
  changeSummary?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Metadata bổ trợ (IP, user agent, client info...)',
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Thời điểm tạo sự kiện (ISO 8601)',
    example: '2026-11-24T14:00:00.000Z',
  })
  createdAt!: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 100 })
  total!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}

export class ListAuditLogsResponseDto {
  @ApiProperty({
    type: [AuditLogItemDto],
    description: 'Danh sách bản ghi kiểm toán',
  })
  items!: AuditLogItemDto[];

  @ApiProperty({
    type: PaginationMetaDto,
    description: 'Thông tin phân trang',
  })
  meta!: PaginationMetaDto;
}
