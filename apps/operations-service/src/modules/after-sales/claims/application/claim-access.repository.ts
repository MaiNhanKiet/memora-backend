import type { GetReturnReceiptForRefundResponse } from '@app/contracts';

export const CLAIM_ACCESS_REPOSITORY = Symbol('CLAIM_ACCESS_REPOSITORY');

export interface ClaimAccessRepository {
  findRequesterClaim(
    claimId: string,
    customerIdentityId: string,
  ): Promise<{ readonly status: string } | null>;
  findReturnReceipt(
    claimId: string,
  ): Promise<GetReturnReceiptForRefundResponse>;
}
