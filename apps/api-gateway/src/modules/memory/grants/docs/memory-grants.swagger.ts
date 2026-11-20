import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  CreateAccessGrantResponseDto,
  GetMemoryBySessionResponseDto,
  ListAccessGrantsResponseDto,
  RedeemInvitationResponseDto,
  RevokeAccessGrantResponseDto,
} from '../dto/memory-grant.dto';

export function ApiCreateAccessGrantDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-010] Mời người thân/bạn bè truy cập thẻ',
      description:
        'Chủ sở hữu thẻ tạo lời mời chia sẻ quyền xem Kỷ Ức Số qua Email. Hệ thống sinh mã token ngẫu nhiên bảo mật.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: CreateAccessGrantResponseDto,
      status: 201,
      description: 'Tạo lời mời truy cập thành công',
    }),
  );
}

export function ApiListAccessGrantsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-011] Xem danh sách người được chia sẻ quyền',
      description:
        'Chủ sở hữu xem danh sách các lời mời, trạng thái (PENDING, ACTIVE, REVOKED) và lịch sử truy cập.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: ListAccessGrantsResponseDto,
      status: 200,
      description: 'Danh sách quyền truy cập',
    }),
  );
}

export function ApiRevokeAccessGrantDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-012] Thu hồi quyền truy cập của người thân',
      description:
        'Chủ sở hữu lập tức hủy bỏ quyền xem Kỷ Ức Số của một người đã được cấp trước đó.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiParam({
      name: 'grantId',
      required: true,
      type: String,
      description: 'ID của lượt cấp quyền (UUID v4)',
    }),
    ApiSuccessResponse({
      type: RevokeAccessGrantResponseDto,
      status: 200,
      description: 'Thu hồi quyền thành công',
    }),
  );
}

export function ApiRedeemInvitationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[MEMOR-013] Đổi mã token lời mời lấy Web Session',
      description:
        'Người được mời kích hoạt liên kết hoặc nhập token để lấy phiên Web Session truy cập kỷ vật. Không bắt buộc đăng nhập tài khoản.',
    }),
    ApiSuccessResponse({
      type: RedeemInvitationResponseDto,
      status: 200,
      description: 'Đổi token thành công, phiên truy cập đã được kích hoạt',
    }),
  );
}

export function ApiGetMemoryBySessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[MEMOR-014] Xem nội dung Kỷ Ức Số qua Web Session',
      description:
        'Khách truy cập (Public Guest) xem nội dung kỷ niệm thông qua mã phiên Web Session. Cần cung cấp mã PIN nếu thẻ được bảo vệ.',
    }),
    ApiParam({
      name: 'accessSessionId',
      required: true,
      type: String,
      description: 'Mã phiên truy cập (UUID v4)',
    }),
    ApiQuery({
      name: 'pin',
      required: false,
      type: String,
      description: 'Mã PIN bảo mật của thẻ',
    }),
    ApiSuccessResponse({
      type: GetMemoryBySessionResponseDto,
      status: 200,
      description: 'Nội dung Kỷ Ức Số của thẻ',
    }),
  );
}
