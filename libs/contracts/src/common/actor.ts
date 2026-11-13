/**
 * Contract TypeScript khớp proto/common/v1/actor.proto (memora.common.v1).
 * proto-loader `keepCase: false`: snake_case → camelCase.
 * Gateway gửi shape này; service đọc qua `parseVerifiedActor` (`@app/common`).
 */
export interface VerifiedActor {
  userId: string;
  /** Bỏ trống khi user chưa có customer identity. */
  customerIdentityId?: string;
}
