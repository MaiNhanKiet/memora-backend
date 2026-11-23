import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { MemoryContentItemDto } from '../../contents/dto/memory-content.dto';

export class CreateAccessGrantDto {
  @ApiProperty({
    description:
      'Địa chỉ email của người thân/bạn bè được chia sẻ quyền truy cập',
    example: 'friend@example.com',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Địa chỉ email không đúng định dạng' })
  granteeEmail!: string;

  @ApiPropertyOptional({
    description:
      'Thời hạn hiệu lực của lời mời (tính bằng ngày, tối đa 30 ngày)',
    default: 7,
    minimum: 1,
    maximum: 30,
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  ttlDays?: number = 7;
}

export class RedeemInvitationDto {
  @ApiProperty({
    description: 'Mã token lời mời nhận được qua email hoặc liên kết chia sẻ',
    example: 'a1b2c3d4e5f60718293a4b5c6d7e8f90...',
  })
  @IsNotEmpty({ message: 'Mã token lời mời không được để trống' })
  @IsString()
  invitationToken!: string;
}

export class GetMemoryBySessionQueryDto {
  @ApiPropertyOptional({
    description: 'Mã PIN bảo mật của thẻ (nếu thẻ yêu cầu mã PIN)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  pin?: string;
}

export class AccessGrantItemDto {
  @ApiProperty({ description: 'ID của lượt cấp quyền (UUID v4)' })
  id!: string;

  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  memoryCardId!: string;

  @ApiProperty({ description: 'Email của người được mời' })
  granteeEmail!: string;

  @ApiProperty({
    description: 'Trạng thái quyền (PENDING, ACTIVE, REVOKED, EXPIRED)',
  })
  status!: string;

  @ApiPropertyOptional({ description: 'Thời điểm hết hạn lời mời' })
  inviteExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Thời điểm chấp nhận lời mời' })
  acceptedAt?: string;

  @ApiPropertyOptional({ description: 'Thời điểm truy cập gần nhất' })
  lastAccessedAt?: string;

  @ApiProperty({ description: 'Thời điểm tạo lời mời' })
  createdAt!: string;
}

export class CreateAccessGrantResponseDto {
  @ApiProperty({ description: 'ID của lượt cấp quyền' })
  grantId!: string;

  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  memoryCardId!: string;

  @ApiProperty({ description: 'Email người nhận' })
  granteeEmail!: string;

  @ApiProperty({ description: 'Mã token lời mời bí mật' })
  invitationToken!: string;

  @ApiProperty({ description: 'Đường link truy cập nhanh cho người thân' })
  inviteUrl!: string;

  @ApiProperty({ description: 'Thời điểm hết hạn lời mời' })
  expiresAt!: string;
}

export class ListAccessGrantsResponseDto {
  @ApiProperty({ type: [AccessGrantItemDto] })
  items!: AccessGrantItemDto[];
}

export class RevokeAccessGrantResponseDto {
  @ApiProperty({ description: 'Trạng thái thành công', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Thông điệp phản hồi' })
  message!: string;
}

export class RedeemInvitationResponseDto {
  @ApiProperty({
    description:
      'Mã phiên truy cập Web Session (dùng để xem kỷ vật không cần đăng nhập)',
  })
  accessSessionId!: string;

  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  memoryCardId!: string;

  @ApiProperty({ description: 'Thời điểm phiên hết hạn' })
  expiresAt!: string;

  @ApiProperty({
    description: 'Cờ báo hiệu thẻ có được bảo vệ bằng mã PIN hay không',
  })
  requiresPin!: boolean;
}

export class GetMemoryBySessionResponseDto {
  @ApiProperty({ description: 'ID Thẻ Ký Ức' })
  cardId!: string;

  @ApiProperty({ description: 'Trạng thái thẻ' })
  status!: string;

  @ApiProperty({
    type: [MemoryContentItemDto],
    description: 'Danh sách các mục kỷ niệm',
  })
  items!: MemoryContentItemDto[];
}
