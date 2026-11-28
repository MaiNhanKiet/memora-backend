import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  ClaimQuoteAction,
  type AuthorizeClaimQuoteAccessResponse,
} from '@app/contracts';
import {
  CLAIM_ACCESS_REPOSITORY,
  type ClaimAccessRepository,
} from './claim-access.repository';

@Injectable()
export class ClaimAccessUseCase {
  constructor(
    @Inject(CLAIM_ACCESS_REPOSITORY)
    private readonly repository: ClaimAccessRepository,
  ) {}

  async execute(
    claimId: string,
    customerIdentityId: string,
    action: ClaimQuoteAction,
  ): Promise<AuthorizeClaimQuoteAccessResponse> {
    if (!isUUID(claimId))
      throw new BadRequestException('Claim ID must be a UUID');
    if (
      action !== ClaimQuoteAction.VIEW_QUOTE &&
      action !== ClaimQuoteAction.ACCEPT_QUOTE &&
      action !== ClaimQuoteAction.PAY_QUOTE
    ) {
      throw new BadRequestException('Invalid claim quote action');
    }
    const claim = await this.repository.findRequesterClaim(
      claimId,
      customerIdentityId,
    );
    if (!claim || claim.status === 'DRAFT') return { allowed: false };
    return {
      allowed:
        action === ClaimQuoteAction.VIEW_QUOTE ||
        !['REJECTED', 'CANCELLED', 'CLOSED'].includes(claim.status),
    };
  }
}
