import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateOrderRequest, CreateOrderResponse } from '@app/contracts';
import {
  ORDERING_REPOSITORY,
  type OrderingRepository,
} from './ordering.repository';
import {
  assertOrderingDraftsOwnedByActor,
  parseDeliveryAddressJson,
  resolveOrderingActorId,
  validateOrderingActor,
} from './ordering.validation';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDERING_REPOSITORY)
    private readonly repository: OrderingRepository,
  ) {}

  async execute(request: CreateOrderRequest): Promise<CreateOrderResponse> {
    const actor = validateOrderingActor(request.actor);
    const { actorId } = resolveOrderingActorId(actor);

    if (
      !request.selectedDraftIds ||
      request.selectedDraftIds.length < 1 ||
      request.selectedDraftIds.length > 2
    ) {
      throw new BadRequestException(
        'An order must contain between 1 and 2 ring design drafts',
      );
    }

    const drafts = await this.repository.findDraftsByIds(
      request.selectedDraftIds,
    );
    if (drafts.length !== request.selectedDraftIds.length) {
      throw new NotFoundException(
        'One or more selected drafts were not found or are no longer in cart',
      );
    }

    assertOrderingDraftsOwnedByActor(drafts, actor);

    const hasPersonalization = drafts.some(
      (d) =>
        d.personalizationPackage === 'FINGERPRINT' ||
        d.personalizationPackage === 'SOUNDWAVE',
    );

    if (actor.kind !== 'USER' && hasPersonalization) {
      throw new ForbiddenException(
        'Guest checkout is not permitted for personalized rings (FINGERPRINT / SOUNDWAVE). Please sign in.',
      );
    }

    let preP1NoticeVersion: string | undefined;
    let privacyNoticeAcknowledgedAt: Date | undefined;
    let p1NonrefundAcknowledgedAt: Date | undefined;
    let preP1EvidenceJson: Record<string, unknown> | undefined;

    if (hasPersonalization) {
      if (
        !request.preP1Acknowledgement ||
        !request.preP1Acknowledgement.privacyNoticeAcknowledged ||
        !request.preP1Acknowledgement.p1NonrefundAcknowledged
      ) {
        throw new BadRequestException(
          'Pre-P1 consent and non-refund acknowledgment are mandatory for orders with personalized items',
        );
      }
      preP1NoticeVersion = request.preP1Acknowledgement.noticeVersion || 'v1.0';
      privacyNoticeAcknowledgedAt = new Date();
      p1NonrefundAcknowledgedAt = new Date();
      preP1EvidenceJson = {
        noticeVersion: preP1NoticeVersion,
        privacyNoticeAcknowledged: true,
        p1NonrefundAcknowledged: true,
        acknowledgedAt: privacyNoticeAcknowledgedAt.toISOString(),
      };
    }

    let resolvedSourcePlanMode = 'N/A';
    if (drafts.length === 2) {
      const p1 = drafts[0].personalizationPackage;
      const p2 = drafts[1].personalizationPackage;
      if (
        (p1 === 'FINGERPRINT' && p2 === 'FINGERPRINT') ||
        (p1 === 'SOUNDWAVE' && p2 === 'SOUNDWAVE')
      ) {
        resolvedSourcePlanMode =
          request.sourcePlanMode === 'SHARED' ||
          request.sourcePlanMode === 'SEPARATE'
            ? request.sourcePlanMode
            : 'SHARED';
      }
    }

    const initialStatus = hasPersonalization
      ? 'AWAITING_P1'
      : 'PENDING_FINAL_QUOTE';

    const result = await this.repository.createOrderTransaction({
      ownerCustomerIdentityId: actorId,
      guestEmail: actor.kind === 'USER' ? undefined : request.recipientEmail,
      guestPhone: actor.kind === 'USER' ? undefined : request.recipientPhone,
      createdFromCartId: drafts[0]?.cartId,
      status: initialStatus,
      sourcePlanMode: resolvedSourcePlanMode,
      preP1NoticeVersion,
      privacyNoticeAcknowledgedAt,
      p1NonrefundAcknowledgedAt,
      preP1EvidenceJson,
      fulfillmentMode: request.fulfillmentMode || 'DELIVERY',
      recipientName: request.recipientName,
      recipientPhone: request.recipientPhone,
      recipientEmail: request.recipientEmail,
      deliveryAddressJson: parseDeliveryAddressJson(
        request.deliveryAddressJson,
      ),
      selectedDrafts: drafts,
    });

    const depositNum = hasPersonalization
      ? Math.round(result.totalAmount * 0.3)
      : 0;

    return {
      orderId: result.orderId,
      orderNo: result.orderNo,
      status: result.status,
      sourcePlanMode: result.sourcePlanMode,
      itemsCount: result.itemsCount,
      totalAmount: result.totalAmount,
      depositAmount: depositNum,
      currency: 'VND',
      createdAt: result.createdAt.toISOString(),
      items: result.items,
    };
  }
}
