import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import {
  RingItemReviewTransition,
  type ApplyRingItemReviewTransitionRequest,
  type ApplyRingItemReviewTransitionResponse,
} from '@app/contracts';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
  type RingItemReviewTransitionInput,
} from './ordering.repository';

const REVIEW_TRANSITIONS = {
  [RingItemReviewTransition.MARK_READY_FOR_REVIEW]: {
    from: 'DRAFT',
    to: 'READY_FOR_REVIEW',
  },
  [RingItemReviewTransition.SUBMIT_FOR_REVIEW]: {
    from: 'READY_FOR_REVIEW',
    to: 'SUBMITTED',
  },
  [RingItemReviewTransition.APPROVE_REVIEW]: {
    from: 'SUBMITTED',
    to: 'MANAGER_APPROVED',
  },
} as const satisfies Partial<
  Record<
    RingItemReviewTransition,
    Pick<RingItemReviewTransitionInput, 'from' | 'to'>
  >
>;

@Injectable()
export class ApplyRingItemReviewTransitionUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(
    request: ApplyRingItemReviewTransitionRequest,
  ): Promise<ApplyRingItemReviewTransitionResponse> {
    const { orderId, ringItemId, ringItemVersionId, transition } = request;
    if (!isUUID(orderId) || !isUUID(ringItemId) || !isUUID(ringItemVersionId)) {
      throw new BadRequestException(
        'Order, ring item and version IDs must be UUIDs',
      );
    }
    if (
      transition !== RingItemReviewTransition.MARK_READY_FOR_REVIEW &&
      transition !== RingItemReviewTransition.SUBMIT_FOR_REVIEW &&
      transition !== RingItemReviewTransition.APPROVE_REVIEW
    ) {
      throw new BadRequestException('Invalid ring item review transition');
    }

    return this.repository.applyRingItemReviewTransition({
      orderId: orderId.toLowerCase(),
      ringItemId: ringItemId.toLowerCase(),
      ringItemVersionId: ringItemVersionId.toLowerCase(),
      ...REVIEW_TRANSITIONS[transition],
    });
  }
}
