import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import { consentErrors, ConsentReason } from '../application/consent.errors';
import type {
  ConsentRecord,
  ConsentRepository,
  CreateAcceptedConsentInput,
  CreateAcceptedConsentResult,
} from '../application/consent.repository';

interface ConsentRow {
  id: string;
  customer_identity_id: string;
  order_id: string | null;
  consent_type: string;
  policy_version: string;
  status: string;
  accepted_at: Date;
  revoked_at: Date | null;
  consent_ring_items: { ring_item_id: string }[];
}

const WITH_ITEMS = {
  consent_ring_items: {
    select: { ring_item_id: true },
    orderBy: { ring_item_id: 'asc' },
  },
} as const;

@Injectable()
export class PrismaConsentRepository implements ConsentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createAcceptedIfAbsent(
    input: CreateAcceptedConsentInput,
  ): Promise<CreateAcceptedConsentResult> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize concurrent accepts for the same order. Under READ COMMITTED the
      // second transaction waits here, then its re-check below sees the committed row.
      const lockKey = `consent:${input.orderId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

      const overlapping = await tx.consents.findMany({
        where: {
          order_id: input.orderId,
          consent_type: input.consentType,
          status: 'ACCEPTED',
          consent_ring_items: {
            some: { ring_item_id: { in: [...input.ringItemIds] } },
          },
        },
        include: WITH_ITEMS,
      });
      const wanted = [...input.ringItemIds].sort();
      for (const row of overlapping) {
        const ids = row.consent_ring_items
          .map((item) => item.ring_item_id)
          .sort();
        const sameSet =
          row.customer_identity_id === input.customerIdentityId &&
          ids.length === wanted.length &&
          ids.every((id, index) => id === wanted[index]);
        if (sameSet) {
          return { consent: toRecord(row), created: false };
        }
      }
      if (overlapping.length > 0) {
        throw consentErrors.alreadyExists(ConsentReason.ITEM_ALREADY_CONSENTED);
      }

      const created = await tx.consents.create({
        data: {
          customer_identity_id: input.customerIdentityId,
          order_id: input.orderId,
          consent_type: input.consentType,
          policy_version: input.policyVersion,
          status: 'ACCEPTED',
          accepted_at: new Date(),
          channel: 'WEB',
          evidence_metadata_json: {},
          consent_ring_items: {
            create: input.ringItemIds.map((ringItemId) => ({
              ring_item_id: ringItemId,
            })),
          },
        },
        include: WITH_ITEMS,
      });
      return { consent: toRecord(created), created: true };
    });
  }

  async listByOrderForCustomer(
    orderId: string,
    customerIdentityId: string,
  ): Promise<ConsentRecord[]> {
    const rows = await this.prisma.consents.findMany({
      where: { order_id: orderId, customer_identity_id: customerIdentityId },
      orderBy: [{ accepted_at: 'desc' }, { created_at: 'desc' }],
      include: WITH_ITEMS,
    });
    return rows.map(toRecord);
  }

  async findByIdForCustomer(
    consentId: string,
    orderId: string,
    customerIdentityId: string,
  ): Promise<ConsentRecord | undefined> {
    const row = await this.prisma.consents.findFirst({
      where: {
        id: consentId,
        order_id: orderId,
        customer_identity_id: customerIdentityId,
      },
      include: WITH_ITEMS,
    });
    return row === null ? undefined : toRecord(row);
  }

  async markRevoked(consentId: string, revokedAt: Date): Promise<void> {
    await this.prisma.consents.updateMany({
      where: { id: consentId, status: 'ACCEPTED' },
      data: { status: 'REVOKED', revoked_at: revokedAt },
    });
  }
}

function toRecord(row: ConsentRow): ConsentRecord {
  return {
    id: row.id,
    orderId: row.order_id ?? '',
    consentType: row.consent_type,
    policyVersion: row.policy_version,
    status: row.status,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    ringItemIds: row.consent_ring_items.map((item) => item.ring_item_id),
  };
}
