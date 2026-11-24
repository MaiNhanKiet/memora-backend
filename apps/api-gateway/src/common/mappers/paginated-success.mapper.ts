import { SuccessResponse, toPaginationMeta } from '@app/common';
import type { PaginatedGrpcResult, PaginationMeta } from '@app/contracts';

export function toPaginatedSuccessResponse<T>(
  result: PaginatedGrpcResult<T> | { data?: T[]; pagination: PaginationMeta },
  message?: string,
): SuccessResponse<T[]> {
  return new SuccessResponse(result.data ?? [], {
    ...(message === undefined ? {} : { message }),
    meta: toPaginationMeta(result.pagination),
  });
}
