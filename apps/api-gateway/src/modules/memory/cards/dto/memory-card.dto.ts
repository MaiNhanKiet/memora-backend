import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ListMyCardsQueryDto {
  @ApiPropertyOptional({
    description: 'Số trang (bắt đầu từ 1)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Số lượng phần tử mỗi trang',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ActivateCardDto {
  @ApiPropertyOptional({
    description: 'Mã PIN bảo mật khởi tạo (4 đến 6 chữ số)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải gồm từ 4 đến 6 chữ số' })
  initialPin?: string;
}

export class SetupPinDto {
  @ApiProperty({
    description: 'Mã PIN mới cần thiết lập (4 đến 6 chữ số)',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN không được để trống' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải gồm từ 4 đến 6 chữ số' })
  pin!: string;
}

export class ChangePinDto {
  @ApiProperty({
    description: 'Mã PIN hiện tại',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã PIN hiện tại không được để trống' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN phải gồm từ 4 đến 6 chữ số' })
  currentPin!: string;

  @ApiProperty({
    description: 'Mã PIN mới (4 đến 6 chữ số)',
    example: '654321',
  })
  @IsNotEmpty({ message: 'Mã PIN mới không được để trống' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN mới phải gồm từ 4 đến 6 chữ số' })
  newPin!: string;
}

export class ResetPinDto {
  @ApiProperty({
    description: 'Mã PIN mới sau khi đặt lại (4 đến 6 chữ số)',
    example: '987654',
  })
  @IsNotEmpty({ message: 'Mã PIN mới không được để trống' })
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'Mã PIN mới phải gồm từ 4 đến 6 chữ số' })
  newPin!: string;

  @ApiProperty({
    description: 'Mã OTP xác thực danh tính gửi về email',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Mã xác thực OTP không được để trống' })
  @IsString()
  verificationCode!: string;
}

export class PinActionResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  success!: boolean;

  @ApiProperty({
    description: 'Thông điệp kết quả',
    example: 'Thao tác thành công',
  })
  message!: string;

  @ApiProperty({ description: 'Thời điểm cập nhật' })
  updatedAt!: string;
}

export class MemoryCardSummaryDto {
  @ApiProperty({ description: 'ID của Memory Card (UUID v4)' })
  id!: string;

  @ApiProperty({ description: 'ID của sản phẩm nhẫn (ring_item_id)' })
  ringItemId!: string;

  @ApiProperty({ description: 'Email của chủ sở hữu' })
  ownerEmail!: string;

  @ApiProperty({
    description: 'Trạng thái thẻ (PENDING, ACTIVE, DISABLED, DELETED)',
    example: 'ACTIVE',
  })
  status!: string;

  @ApiProperty({ description: 'Thẻ đã được cài mã PIN chưa' })
  hasPin!: boolean;

  @ApiProperty({ description: 'Thẻ có đang bị khóa do nhập sai PIN không' })
  isLocked!: boolean;

  @ApiPropertyOptional({ description: 'Thời điểm hết hạn khóa PIN' })
  lockedUntil?: string;

  @ApiPropertyOptional({ description: 'Thời điểm kích hoạt thẻ' })
  activatedAt?: string;

  @ApiProperty({ description: 'Thời điểm tạo thẻ' })
  createdAt!: string;

  @ApiProperty({ description: 'Thời điểm cập nhật thẻ' })
  updatedAt!: string;
}

export class ListMyCardsResponseDto {
  @ApiProperty({ type: [MemoryCardSummaryDto] })
  items!: MemoryCardSummaryDto[];

  @ApiProperty({ description: 'Tổng số thẻ' })
  total!: number;

  @ApiProperty({ description: 'Trang hiện tại' })
  page!: number;

  @ApiProperty({ description: 'Số lượng mỗi trang' })
  limit!: number;
}

export class MemoryCardDetailDto extends MemoryCardSummaryDto {
  @ApiProperty({ description: 'Số lần nhập sai mã PIN hiện tại' })
  pinFailedAttempts!: number;

  @ApiPropertyOptional({ description: 'Key ảnh AR Target gắn với nhẫn' })
  arTargetAssetKey?: string;

  @ApiProperty({ description: 'Người gọi có phải chủ sở hữu thẻ không' })
  isOwner!: boolean;
}
