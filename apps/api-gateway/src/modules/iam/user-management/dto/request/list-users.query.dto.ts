import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../../common/dto/pagination-query.dto';

const USER_STATUSES = ['ACTIVE', 'LOCKED', 'DISABLED'] as const;

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: USER_STATUSES })
  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: (typeof USER_STATUSES)[number];
}
