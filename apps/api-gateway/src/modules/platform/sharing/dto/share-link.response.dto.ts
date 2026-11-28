import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResolvedShareLinkResponseDto {
  @ApiProperty({
    description: 'Mã token chia sẻ công khai',
    example: 'memora-3d-8f2e1a90c4b2',
  })
  shareToken!: string;

  @ApiProperty({
    description: 'Trạng thái của link chia sẻ',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn (ISO 8601)',
    example: '2026-12-01T12:00:00.000Z',
  })
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'ID mẫu nhẫn nếu có',
  })
  ringTemplateId?: string;

  @ApiPropertyOptional({
    description: 'ID bản nháp thiết kế nếu có',
  })
  ringDesignDraftId?: string;

  @ApiProperty({
    description: 'Dữ liệu phối cảnh 3D trực quan đã sanitize',
  })
  sanitizedSnapshot!: Record<string, unknown>;

  @ApiProperty({
    description: 'Thời điểm tạo link (ISO 8601)',
  })
  createdAt!: string;
}

export class CreateShareLinkResponseDto {
  @ApiProperty({
    description: 'ID bản ghi share link',
    example: '33333333-3333-3333-3333-333333333333',
  })
  id!: string;

  @ApiProperty({
    description: 'Mã token chia sẻ',
    example: 'memora-3d-8f2e1a90c4b2',
  })
  shareToken!: string;

  @ApiProperty({
    description: 'Đường dẫn URL chia sẻ công khai',
    example: '/api/v1/shares/memora-3d-8f2e1a90c4b2',
  })
  shareUrl!: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({
    description: 'Thời điểm hết hạn (ISO 8601)',
  })
  expiresAt!: string;
}

export class RevokeShareLinkResponseDto {
  @ApiProperty({
    description: 'ID bản ghi share link',
    example: '33333333-3333-3333-3333-333333333333',
  })
  id!: string;

  @ApiProperty({
    description: 'Trạng thái mới',
    example: 'REVOKED',
  })
  status!: string;

  @ApiProperty({
    description: 'Thời điểm thu hồi (ISO 8601)',
  })
  revokedAt!: string;
}
