import { BadRequestException } from '@nestjs/common';

/**
 * Đọc `memora.common.v1.VerifiedActor` trong request gRPC ở service nghiệp vụ (D-P-03).
 * Không import @app/contracts từ libs/common, nên khai báo shape wire tại đây.
 * proto-loader bỏ field rỗng, nên mọi field đều có thể thiếu hoặc null.
 */
export interface VerifiedActorWire {
  userId?: string | null;
  customerIdentityId?: string | null;
}

/** Actor đã kiểm tra, truyền vào use case. */
export interface ParsedVerifiedActor {
  readonly userId: string;
  readonly customerIdentityId: string | undefined;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Lỗi là `BadRequestException`; `GrpcExceptionFilter` trả `INVALID_ARGUMENT`.
 * Thiếu actor nghĩa là Gateway gọi sai, không phải lỗi người dùng.
 * Hàm chỉ kiểm tra định dạng. Quyền trên resource do use case kiểm tra.
 */
export function parseVerifiedActor(
  actor: VerifiedActorWire | null | undefined,
): ParsedVerifiedActor {
  if (actor === undefined || actor === null) {
    throw new BadRequestException('Actor is required');
  }
  const userId = actor.userId ?? '';
  if (userId === '') {
    throw new BadRequestException('Actor user id is required');
  }
  if (!UUID_PATTERN.test(userId)) {
    throw new BadRequestException('Actor user id is invalid');
  }
  const customerIdentityId = actor.customerIdentityId ?? '';
  if (customerIdentityId === '') {
    return { userId, customerIdentityId: undefined };
  }
  if (!UUID_PATTERN.test(customerIdentityId)) {
    throw new BadRequestException('Actor customer identity id is invalid');
  }
  return { userId, customerIdentityId };
}

/** Dùng cho RPC chỉ dành cho khách hàng (resource thuộc customer identity). */
export function requireCustomerActor(
  actor: ParsedVerifiedActor,
): ParsedVerifiedActor & { readonly customerIdentityId: string } {
  if (actor.customerIdentityId === undefined) {
    throw new BadRequestException('Actor customer identity id is required');
  }
  return { userId: actor.userId, customerIdentityId: actor.customerIdentityId };
}
