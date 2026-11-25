import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class ListAuditLogsQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc theo ID người dùng thực hiện (UUID)',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo loại thực thể (ORDER, USER, PAYMENT, DELIVERY...)',
    example: 'ORDER',
  })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo mã hành vi (USER_ROLE_ASSIGNED, ORDER_PAID...)',
    example: 'USER_ROLE_ASSIGNED',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái kết quả (SUCCESS, FAILED, REJECTED)',
    example: 'SUCCESS',
  })
  @IsOptional()
  @IsString()
  resultStatus?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu (ISO 8601 string)',
    example: '2026-11-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm kết thúc (ISO 8601 string)',
    example: '2026-11-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số bản ghi trên mỗi trang (1-100)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
