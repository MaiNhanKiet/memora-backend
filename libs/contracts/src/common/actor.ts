/**
 * Contract TypeScript khớp proto/common/v1/actor.proto (memora.common.v1).
 * proto-loader `keepCase: false`: snake_case → camelCase.
 * Gateway gửi shape này; service đọc qua `parseVerifiedActor` (`@app/common`).
 * Kết hợp hợp lệ: `userId` [+ `customerIdentityId`] | chỉ `customerIdentityId`
 * (khách đã xác minh email) | chỉ `guestSessionId` (khách ẩn danh).
 */
export interface VerifiedActor {
  userId?: string;
  /** Bỏ trống khi chưa có customer identity. */
  customerIdentityId?: string;
  /** Chỉ cho khách ẩn danh; phiên do IAM cấp và Gateway đã kiểm tra (D-P-17). */
  guestSessionId?: string;
}
