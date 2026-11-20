import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  InitiateMediaUploadResponseDto,
  ListCardContentsResponseDto,
  UpdateCardContentsResponseDto,
} from '../dto/memory-content.dto';

export function ApiListCardContentsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-007] Danh sách nội dung Ký Ức Số',
      description:
        'Xem tất cả các hình ảnh, video, audio và văn bản kỷ niệm gắn với Thẻ Ký Ức. Nếu thẻ có PIN thì cần gửi kèm PIN để xác thực.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiQuery({
      name: 'pin',
      required: false,
      type: String,
      description: 'Mã PIN bảo mật của thẻ',
    }),
    ApiSuccessResponse({
      type: ListCardContentsResponseDto,
      status: 200,
      description: 'Danh sách nội dung kỷ niệm của thẻ',
    }),
  );
}

export function ApiUpdateCardContentsDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-008] Cập nhật toàn bộ nội dung Ký Ức Số',
      description:
        'Chủ sở hữu thêm mới, chỉnh sửa, hoặc sắp xếp lại thứ tự các kỷ niệm (Text, Image, Video, Audio).',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: UpdateCardContentsResponseDto,
      status: 200,
      description: 'Cập nhật nội dung thành công',
    }),
  );
}

export function ApiInitiateMediaUploadDocs() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '[MEMOR-009] Khởi tạo upload file kỷ niệm lên S3',
      description:
        'Chủ sở hữu yêu cầu lấy Presigned PUT URL để tải trực tiếp ảnh/video/audio dung lượng tối đa 100MB lên Garage Object Storage.',
    }),
    ApiParam({
      name: 'cardId',
      required: true,
      type: String,
      description: 'ID của Memory Card (UUID v4)',
    }),
    ApiSuccessResponse({
      type: InitiateMediaUploadResponseDto,
      status: 200,
      description: 'Khởi tạo upload URL thành công',
    }),
  );
}
