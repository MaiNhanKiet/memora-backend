import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ListAuditLogsResponseDto } from '../dto';

export function ApiListAuditLogsDocs() {
  return applyDecorators(
    ApiBearerAuth('JWT'),
    ApiOperation({
      summary: '[PLATF-017] Tra cứu nhật ký kiểm toán hệ thống (Audit Logs)',
      description:
        'Dành cho Quản trị viên (Admin/Manager). Cung cấp bộ lọc theo người thực hiện, loại tài nguyên, hành vi, kết quả và khoảng thời gian. Hỗ trợ phân trang truy vấn.',
    }),
    ApiResponse({
      status: 200,
      description: 'Danh sách bản ghi kiểm toán kèm phân trang',
      type: ListAuditLogsResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Chưa xác thực hoặc token không hợp lệ',
    }),
    ApiResponse({
      status: 403,
      description:
        'Không có quyền truy cập nhật ký kiểm toán (Yêu cầu IAM_SECURITY_AUDIT_READ)',
    }),
  );
}
