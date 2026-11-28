import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type {
  GetFullOrderHandoverForRingItemRequest,
  GetFullOrderHandoverForRingItemResponse,
} from '@app/contracts';
import {
  HANDOVER_PROOF_REPOSITORY,
  type HandoverProofRepository,
} from './handover-proof.repository';

@Injectable()
export class GetFullOrderHandoverUseCase {
  constructor(
    @Inject(HANDOVER_PROOF_REPOSITORY)
    private readonly repository: HandoverProofRepository,
  ) {}

  async execute(
    request: GetFullOrderHandoverForRingItemRequest,
  ): Promise<GetFullOrderHandoverForRingItemResponse> {
    const ringItemId = request.ringItemId;
    if (!isUUID(ringItemId)) {
      throw new BadRequestException('ringItemId must be a UUID');
    }

    const orderId = await this.repository.findCompletedOrderIdByRingItemId(
      ringItemId.toLowerCase(),
    );
    return orderId ? { completed: true, orderId } : { completed: false };
  }
}
