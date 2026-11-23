import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  MemoryCardDetailDto,
  MemoryCardSummaryDto,
  PinActionResponseDto,
} from '../dto/memory-card.dto';

export function ApiListMyCardsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-001] Danh sách Thẻ Ký Ức của tôi',
      description:
        'Khách hàng xem danh sách tất cả các Thẻ Ký Ức mà mình sở hữu kèm trạng thái kích hoạt và PIN.',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, example: 20 }),
    ApiSuccessResponse({
      type: MemoryCardSummaryDto,
      status: 200,
      description: 'Danh sách thẻ ký ức phân trang',
      isArray: true,
      paginated: true,
    }),
  );
}

export function ApiGetCardDetailDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-002] Chi tiết Thẻ Ký Ức',
      description:
        'Xem thông tin chi tiết một thẻ ký ức dành cho chủ sở hữu hoặc người được cấp quyền truy cập.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: MemoryCardDetailDto,
      status: 200,
      description: 'Chi tiết thông tin Thẻ Ký Ức',
    }),
  );
}

export function ApiActivateCardDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-003] Kích hoạt Thẻ Ký Ức',
      description:
        'Chủ sở hữu kích hoạt thẻ sau khi nhận nhẫn bàn giao thành công. Có thể cài đặt mã PIN ban đầu ngay khi kích hoạt.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: MemoryCardDetailDto,
      status: 200,
      description: 'Thẻ đã được kích hoạt thành công',
    }),
  );
}

export function ApiSetupPinDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-004] Cài đặt mã PIN lần đầu',
      description:
        'Thiết lập mã PIN bảo mật (4-6 số) cho thẻ ký ức khi chưa từng cài PIN.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: PinActionResponseDto,
      status: 200,
      description: 'Cài đặt mã PIN thành công',
    }),
  );
}

export function ApiChangePinDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-005] Đổi mã PIN thẻ',
      description:
        'Chủ sở hữu đổi mã PIN bằng cách nhập mã PIN hiện tại và mã PIN mới.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: PinActionResponseDto,
      status: 200,
      description: 'Đổi mã PIN thành công',
    }),
  );
}

export function ApiResetPinDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-006] Đặt lại mã PIN khi quên',
      description:
        'Đặt lại mã PIN bằng mã xác thực OTP gửi về email của chủ sở hữu.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: PinActionResponseDto,
      status: 200,
      description: 'Đặt lại mã PIN thành công',
    }),
  );
}
