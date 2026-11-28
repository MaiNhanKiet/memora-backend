import { Injectable } from '@nestjs/common';
import type { GetReturnReceiptForRefundResponse } from '@app/contracts';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { ClaimAccessRepository } from '../application/claim-access.repository';

@Injectable()
export class PrismaClaimAccessRepository implements ClaimAccessRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRequesterClaim(claimId: string, customerIdentityId: string) {
    return this.prisma.claims.findFirst({
      where: {
        id: claimId,
        requester_customer_identity_id: customerIdentityId,
      },
      select: { status: true },
    });
  }

  async findReturnReceipt(
    claimId: string,
  ): Promise<GetReturnReceiptForRefundResponse> {
    // The Operations authorization milestone attests to intake and inspection.
    const claim = await this.prisma.claims.findFirst({
      where: {
        id: claimId,
        status: 'RESOLUTION_IN_PROGRESS',
        processing_status: { in: ['REFUND_AUTHORIZED', 'REFUND_PENDING'] },
      },
      select: {
        order_id: true,
        ring_item_id: true,
        claim_events: {
          where: {
            decision_code: 'RETURN_APPROVED',
            actor_user_id: { not: null },
          },
          orderBy: { occurred_at: 'desc' },
          take: 1,
          select: { occurred_at: true },
        },
        chain_of_custody_events: {
          where: {
            event_type: 'RETURN_RECEIVED',
            received_by_user_id: { not: null },
            evidence_asset_id: { not: null },
            condition_note: { not: null },
          },
          orderBy: { handoff_at: 'desc' },
          select: {
            id: true,
            ring_item_id: true,
            handoff_at: true,
            condition_note: true,
          },
        },
      },
    });
    const approval = claim?.claim_events[0];
    if (!claim || !approval) return { eligible: false };
    const receipt = claim.chain_of_custody_events.find(
      (event) =>
        event.ring_item_id === claim.ring_item_id &&
        event.handoff_at >= approval.occurred_at &&
        Boolean(event.condition_note?.trim()),
    );
    if (!receipt) return { eligible: false };
    return {
      eligible: true,
      orderId: claim.order_id,
      ringItemId: claim.ring_item_id,
      receiptId: receipt.id,
    };
  }
}
