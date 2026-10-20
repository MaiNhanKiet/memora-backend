import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PermissionCatalogItemResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive!: boolean;
}
