import { BadRequestException, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { parseVerifiedActor, requireCustomerIdentity } from '@app/common';
import type {
  AuthorizeClaimQuoteAccessRequest,
  ClaimQuoteAction,
  GetReturnReceiptForRefundResponse,
  VerifiedActor,
} from '@app/contracts';

export const OPERATIONS_CLAIM_ACCESS = Symbol('OPERATIONS_CLAIM_ACCESS');

export interface OperationsClaimAccess {
  authorize(request: AuthorizeClaimQuoteAccessRequest): Promise<boolean>;
  getReturnReceipt(claimId: string): Promise<GetReturnReceiptForRefundResponse>;
}

export async function requireClaimQuoteAccess(
  access: OperationsClaimAccess,
  claimId: string,
  actor: VerifiedActor,
  action: ClaimQuoteAction,
): Promise<string> {
  if (!isUUID(claimId))
    throw new BadRequestException('Claim ID must be a UUID');
  const identity = requireCustomerIdentity(parseVerifiedActor(actor));
  if (!(await access.authorize({ claimId, actor, action }))) {
    throw new NotFoundException('Claim not found');
  }
  return identity;
}
