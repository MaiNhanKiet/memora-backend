import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ListCardContentsQueryDto {
  @ApiPropertyOptional({
    description: 'Mã PIN bảo mật của thẻ (nếu thẻ có mã PIN)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  pin?: string;
}

export class ContentItemInputDto {
  @ApiPropertyOptional({
    description: 'ID mục nội dung (nếu cập nhật mục cũ)',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Loại nội dung (TEXT, IMAGE, AUDIO, VIDEO)',
    example: 'IMAGE',
    enum: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO'],
  })
  @IsNotEmpty()
  @IsIn(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO'])
  contentType!: string;

  @ApiPropertyOptional({
    description: 'Tiêu đề kỷ niệm',
    example: 'Ngày đầu tiên gặp gỡ',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Nội dung văn bản (bắt buộc với loại TEXT)',
    example: 'Kỷ niệm khó phai tại Đà Lạt...',
  })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Key của file trên Object Storage (bắt buộc với IMAGE/AUDIO/VIDEO)',
    example: 'memories/card-123/sample.jpg',
  })
  @IsOptional()
  @IsString()
  assetKey?: string;

  @ApiProperty({
    description: 'Thứ tự hiển thị (từ nhỏ đến lớn, bắt đầu từ 0)',
    example: 0,
  })
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @ApiPropertyOptional({
    description: 'Cấu hình giao diện layout hiển thị dạng JSON',
    example: '{"theme":"romantic"}',
  })
  @IsOptional()
  @IsString()
  layoutJson?: string;
}

export class UpdateCardContentsDto {
  @ApiProperty({
    description: 'Danh sách các mục nội dung kỷ niệm của thẻ',
    type: [ContentItemInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentItemInputDto)
  items!: ContentItemInputDto[];
}

export class InitiateMediaUploadDto {
  @ApiProperty({
    description: 'Tên file gốc cần tải lên',
    example: 'our_anniversary.jpg',
  })
  @IsNotEmpty()
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'MIME Type của file',
    example: 'image/jpeg',
  })
  @IsNotEmpty()
  @IsString()
  contentType!: string;

  @ApiProperty({
    description: 'Dung lượng file tính bằng Bytes',
    example: 2048576,
  })
  @IsNumber()
  @Min(1)
  fileSize!: number;
}

export class MemoryContentItemDto {
  @ApiProperty({ description: 'ID mục nội dung kỷ niệm (UUID v4)' })
  id!: string;

  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  memoryCardId!: string;

  @ApiProperty({ description: 'Loại nội dung (TEXT, IMAGE, AUDIO, VIDEO)' })
  contentType!: string;

  @ApiPropertyOptional({ description: 'Tiêu đề kỷ niệm' })
  title?: string;

  @ApiPropertyOptional({ description: 'Nội dung văn bản' })
  textContent?: string;

  @ApiPropertyOptional({ description: 'Key lưu trữ file' })
  assetKey?: string;

  @ApiPropertyOptional({
    description: 'Presigned URL để xem/tải trực tiếp file đa phương tiện',
  })
  assetUrl?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị' })
  sortOrder!: number;

  @ApiProperty({ description: 'Trạng thái (ACTIVE, HIDDEN)' })
  status!: string;

  @ApiPropertyOptional({ description: 'Cấu hình layout JSON' })
  layoutJson?: string;

  @ApiProperty({ description: 'Thời điểm tạo' })
  createdAt!: string;

  @ApiProperty({ description: 'Thời điểm cập nhật' })
  updatedAt!: string;
}

export class ListCardContentsResponseDto {
  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  cardId!: string;

  @ApiProperty({ type: [MemoryContentItemDto] })
  items!: MemoryContentItemDto[];
}

export class UpdateCardContentsResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  success!: boolean;

  @ApiProperty({ type: [MemoryContentItemDto] })
  items!: MemoryContentItemDto[];
}

export class InitiateMediaUploadResponseDto {
  @ApiProperty({
    description: 'Presigned URL để Frontend PUT file trực tiếp lên Garage S3',
  })
  uploadUrl!: string;

  @ApiProperty({ description: 'Storage Key của file sau khi upload' })
  assetKey!: string;

  @ApiProperty({ description: 'Thời điểm URL hết hạn' })
  expiresAt!: string;
}
