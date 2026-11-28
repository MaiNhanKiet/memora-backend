import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { GetReturnReceiptForRefundResponse } from '@app/contracts';
import {
  CLAIM_ACCESS_REPOSITORY,
  type ClaimAccessRepository,
} from './claim-access.repository';

@Injectable()
export class ReturnReceiptUseCase {
  constructor(
    @Inject(CLAIM_ACCESS_REPOSITORY)
    private readonly repository: ClaimAccessRepository,
  ) {}

  execute(claimId: string): Promise<GetReturnReceiptForRefundResponse> {
    if (!isUUID(claimId))
      throw new BadRequestException('Claim ID must be a UUID');
    return this.repository.findReturnReceipt(claimId);
  }
}
