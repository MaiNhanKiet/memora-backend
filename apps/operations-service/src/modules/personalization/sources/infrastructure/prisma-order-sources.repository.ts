import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  OrderSourceRecord,
  OrderSourcesRepository,
} from '../application/order-sources.repository';

@Injectable()
export class PrismaOrderSourcesRepository implements OrderSourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForOrder(
    orderId: string,
    ownerCustomerIdentityId: string,
  ): Promise<OrderSourceRecord[]> {
    const activeBinding = { order_id: orderId, released_at: null };
    const rows = await this.prisma.personalization_sources.findMany({
      where: {
        owner_customer_identity_id: ownerCustomerIdentityId,
        status: { not: 'DELETED' },
        OR: [
          { consents: { some: { order_id: orderId } } },
          { source_bindings: { some: activeBinding } },
        ],
      },
      select: {
        id: true,
        source_type: true,
        status: true,
        accepted_at: true,
        metadata_json: true,
        source_bindings: {
          where: activeBinding,
          select: { ring_item_id: true, binding_mode: true },
          orderBy: { ring_item_id: 'asc' },
        },
      },
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      sourceId: row.id,
      sourceType: row.source_type,
      status: row.status,
      failureCode: readFailureCode(row.metadata_json),
      acceptedAt: row.accepted_at,
      ringItemIds: row.source_bindings.map((binding) => binding.ring_item_id),
      bindingMode: row.source_bindings[0]?.binding_mode,
    }));
  }
}

function readFailureCode(metadata: unknown): string | undefined {
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }
  const value = (metadata as Record<string, unknown>).failureCode;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
