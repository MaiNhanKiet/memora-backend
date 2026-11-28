import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  CreateShareLinkResponseDto,
  ResolvedShareLinkResponseDto,
  RevokeShareLinkResponseDto,
} from '../dto';

export function ApiResolveShareLinkDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PLATF-010] Xem public preview 3D đã sanitize từ share link',
      description:
        'Truy cập công khai không yêu cầu đăng nhập. Trả về thông tin mô hình 3D phối cảnh nhẫn (vàng, đá quý, file GLB) đã loại bỏ mọi thông tin nhạy cảm và giá tiền. Trả về 404 nếu link không tồn tại hoặc đã hết hạn.',
    }),
    ApiParam({
      name: 'shareToken',
      description: 'Mã token chia sẻ (URL-safe string)',
      example: 'memora-3d-8f2e1a90c4b2',
    }),
    ApiResponse({
      status: 200,
      description: 'Snapshot phối cảnh 3D trực quan',
      type: ResolvedShareLinkResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'Liên kết chia sẻ không tồn tại hoặc đã hết hạn',
    }),
  );
}

export function ApiCreateShareLinkDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PLATF-011] Tạo liên kết chia sẻ xem trước 3D',
      description:
        'Tạo token và URL chia sẻ công khai cho một bản nháp hoặc cấu hình nhẫn. Dành cho người dùng đã đăng nhập hoặc khách vãng lai (Guest session). Lưu trữ dưới dạng token hash SHA-256.',
    }),
    ApiResponse({
      status: 201,
      description: 'Tạo link chia sẻ thành công',
      type: CreateShareLinkResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Dữ liệu không hợp lệ hoặc thiếu định danh',
    }),
  );
}

export function ApiRevokeShareLinkDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Thu hồi liên kết chia sẻ xem trước 3D',
      description:
        'Vô hiệu hóa liên kết chia sẻ ngay lập tức. Chỉ người tạo link mới có quyền thu hồi.',
    }),
    ApiParam({
      name: 'shareLinkId',
      description: 'ID bản ghi share link (UUID)',
      example: '33333333-3333-3333-3333-333333333333',
    }),
    ApiResponse({
      status: 200,
      description: 'Thu hồi link thành công',
      type: RevokeShareLinkResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Không có quyền thu hồi link chia sẻ này',
    }),
    ApiResponse({
      status: 404,
      description: 'Không tìm thấy link chia sẻ',
    }),
  );
}
