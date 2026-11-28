import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { HandoverProofRepository } from '../application/handover-proof.repository';

interface HandoverProofRow {
  readonly order_id: string;
  readonly snapshot: unknown;
}

function hasValidRingItems(snapshot: unknown): boolean {
  if (
    snapshot === null ||
    typeof snapshot !== 'object' ||
    !('items' in snapshot) ||
    !Array.isArray(snapshot.items)
  ) {
    return false;
  }

  const items: readonly unknown[] = snapshot.items;
  if (items.length < 1 || items.length > 2) return false;

  const ringItemIds = new Set<string>();
  for (const item of items) {
    if (
      item === null ||
      typeof item !== 'object' ||
      !('ringItemId' in item) ||
      typeof item.ringItemId !== 'string' ||
      !isUUID(item.ringItemId)
    ) {
      return false;
    }
    ringItemIds.add(item.ringItemId.toLowerCase());
  }
  return ringItemIds.size === items.length;
}

@Injectable()
export class PrismaHandoverProofRepository implements HandoverProofRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCompletedOrderIdByRingItemId(
    ringItemId: string,
  ): Promise<string | undefined> {
    const candidates = await this.prisma.$queryRaw<HandoverProofRow[]>`
      SELECT proof.order_id, proof.handed_over_items_snapshot_json AS snapshot
      FROM fulfillment.handover_records AS proof
      JOIN fulfillment.handover_sessions AS session
        ON session.id = proof.handover_session_id
        AND session.order_id = proof.order_id
        AND session.handover_type = proof.handover_type
      WHERE proof.handover_scope = 'ORDER'
        AND proof.claim_id IS NULL
        AND session.claim_id IS NULL
        AND proof.handover_type IN ('SALE_PICKUP', 'SALE_DELIVERY')
        AND session.status = 'COMPLETED'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(proof.handed_over_items_snapshot_json -> 'items') = 'array'
              THEN proof.handed_over_items_snapshot_json -> 'items'
              ELSE '[]'::jsonb
            END
          ) AS item(value)
          WHERE lower(item.value ->> 'ringItemId') = ${ringItemId}
        )
      ORDER BY proof.completed_at DESC, proof.id DESC
    `;
    return candidates.find(({ snapshot }) => hasValidRingItems(snapshot))
      ?.order_id;
  }
}
