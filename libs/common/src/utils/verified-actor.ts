import { BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * Đọc `memora.common.v1.VerifiedActor` trong request gRPC ở service nghiệp vụ
 * (D-P-03, mở rộng cho khách vãng lai ở D-P-17).
 * Không import @app/contracts từ libs/common, nên khai báo shape wire tại đây.
 * proto-loader bỏ field rỗng, nên mọi field đều có thể thiếu hoặc null.
 */
export interface VerifiedActorWire {
  userId?: string | null;
  customerIdentityId?: string | null;
  guestSessionId?: string | null;
}

/** Người đã đăng nhập. `customerIdentityId` có khi user đã có customer identity. */
export interface UserActor {
  readonly kind: 'USER';
  readonly userId: string;
  readonly customerIdentityId: string | undefined;
}

/** Khách vãng lai đã xác minh email qua IAM (MF01 AF02: chỉ đơn All-NONE). */
export interface VerifiedGuestActor {
  readonly kind: 'VERIFIED_GUEST';
  readonly customerIdentityId: string;
}

/** Khách ẩn danh có phiên do IAM cấp và Gateway đã kiểm tra (MF01 AF01: Guest Cart). */
export interface GuestSessionActor {
  readonly kind: 'GUEST_SESSION';
  readonly guestSessionId: string;
}

/** Actor đã kiểm tra, truyền vào use case. Dùng `kind` để phân nhánh. */
export type ParsedVerifiedActor =
  UserActor | VerifiedGuestActor | GuestSessionActor;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Xác định loại actor từ các field có giá trị:
 * - `user_id` → USER (không được kèm `guest_session_id`)
 * - chỉ `customer_identity_id` → VERIFIED_GUEST
 * - chỉ `guest_session_id` → GUEST_SESSION
 * Mọi id là UUID. Sai định dạng hoặc kết hợp không hợp lệ là `BadRequestException`
 * (`INVALID_ARGUMENT`): Gateway gọi sai, không phải lỗi người dùng.
 * Hàm chỉ kiểm tra định dạng. Quyền trên resource do use case kiểm tra.
 */
export function parseVerifiedActor(
  actor: VerifiedActorWire | null | undefined,
): ParsedVerifiedActor {
  if (actor === undefined || actor === null) {
    throw new BadRequestException('Actor is required');
  }
  const userId = readOptionalId(actor.userId, 'Actor user id');
  const customerIdentityId = readOptionalId(
    actor.customerIdentityId,
    'Actor customer identity id',
  );
  const guestSessionId = readOptionalId(
    actor.guestSessionId,
    'Actor guest session id',
  );

  if (guestSessionId !== undefined) {
    if (userId !== undefined || customerIdentityId !== undefined) {
      throw new BadRequestException('Actor fields are inconsistent');
    }
    return { kind: 'GUEST_SESSION', guestSessionId };
  }
  if (userId !== undefined) {
    return { kind: 'USER', userId, customerIdentityId };
  }
  if (customerIdentityId !== undefined) {
    return { kind: 'VERIFIED_GUEST', customerIdentityId };
  }
  throw new BadRequestException('Actor is required');
}

/** RPC chỉ cho người đã đăng nhập (ví dụ Consent, capture, upload âm thanh). */
export function requireUserActor(actor: ParsedVerifiedActor): UserActor {
  if (actor.kind !== 'USER') {
    throw new ForbiddenException('Actor must be a signed-in user');
  }
  return actor;
}

/**
 * RPC chỉ cho khách hàng đã đăng nhập và có customer identity
 * (resource thuộc customer identity, cần login: FP/SW, Personalization).
 */
export function requireCustomerActor(
  actor: ParsedVerifiedActor,
): UserActor & { readonly customerIdentityId: string } {
  const user = requireUserActor(actor);
  if (user.customerIdentityId === undefined) {
    throw new BadRequestException('Actor customer identity id is required');
  }
  return {
    kind: 'USER',
    userId: user.userId,
    customerIdentityId: user.customerIdentityId,
  };
}

/**
 * RPC cho chủ một customer identity, kể cả khách vãng lai đã xác minh email
 * (ví dụ đơn All-NONE, MF01 AF02). Trả về customer identity để so với resource.
 */
export function requireCustomerIdentity(actor: ParsedVerifiedActor): string {
  if (actor.kind === 'VERIFIED_GUEST') {
    return actor.customerIdentityId;
  }
  return requireCustomerActor(actor).customerIdentityId;
}

function readOptionalId(
  value: string | null | undefined,
  field: string,
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (!UUID_PATTERN.test(value)) {
    throw new BadRequestException(`${field} is invalid`);
  }
  return value;
}
