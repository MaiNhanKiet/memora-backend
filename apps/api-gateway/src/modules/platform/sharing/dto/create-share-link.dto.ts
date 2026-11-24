import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateShareLinkRequestDto {
  @ApiPropertyOptional({
    description: 'ID bản nháp thiết kế trong giỏ hàng (nếu có)',
    example: '11111111-1111-1111-1111-111111111111',
  })
  @IsOptional()
  @IsUUID()
  ringDesignDraftId?: string;

  @ApiPropertyOptional({
    description: 'ID mẫu nhẫn (nếu có)',
    example: '22222222-2222-2222-2222-222222222222',
  })
  @IsOptional()
  @IsUUID()
  ringTemplateId?: string;

  @ApiProperty({
    description:
      'Snapshot phối cảnh 3D trực quan đã sanitize (chỉ gồm template, material, gemstones, 3d assets; tuyệt đối không chứa giá tiền hay thông tin cá nhân)',
    example: {
      templateCode: 'T_TEST_BAND',
      templateName: 'Classic Comfort Band',
      materialCode: 'GOLD_18K_YELLOW',
      materialName: 'Vàng 18K Vàng',
      glbAssetKey: 'models/T_TEST_BAND.glb',
      glbUrl: 'http://100.78.222.34:3900/memora-catalog/models/T_TEST_BAND.glb',
      gemstones: [],
    },
  })
  @IsObject()
  sanitizedSnapshot!: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Số ngày hiệu lực của link (mặc định 7 ngày, tối đa 90 ngày)',
    default: 7,
    minimum: 1,
    maximum: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}
