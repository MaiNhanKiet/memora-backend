import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import {
  readArtworkState,
  writeArtworkState,
} from '../../shared/source-processing/application/artwork-state';
import type { ArtworkState } from '../../shared/source-processing/application/artwork-state';
import type { JsonValue } from '../../shared/source-processing/application/source-processing.repository';
import type {
  ArtworkRepository,
  ArtworkSourceRecord,
} from '../application/artwork.repository';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const SELECT = {
  id: true,
  source_type: true,
  status: true,
  metadata_json: true,
  consents: {
    where: { order_id: { not: null } },
    select: { order_id: true },
    orderBy: { created_at: 'asc' },
    take: 1,
  },
  source_bindings: {
    where: { released_at: null },
    select: { order_id: true, ring_item_id: true },
    orderBy: { bound_at: 'asc' },
  },
  capture_sessions: {
    select: {
      id: true,
      order_id: true,
      capture_attempts: {
        where: { result: 'ACCEPTED' },
        select: { attempt_no: true },
        take: 1,
      },
    },
  },
} as const;

interface Row {
  readonly id: string;
  readonly source_type: string;
  readonly status: string;
  readonly metadata_json: unknown;
  readonly consents: readonly { order_id: string | null }[];
  readonly source_bindings: readonly {
    order_id: string;
    ring_item_id: string;
  }[];
  readonly capture_sessions: {
    id: string;
    order_id: string;
    capture_attempts: readonly { attempt_no: number }[];
  } | null;
}

/** A worker call (render-crop, up to 45 s) runs inside the transaction. */
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

@Injectable()
export class PrismaArtworkRepository implements ArtworkRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    sourceId: string,
    ownerCustomerIdentityId: string,
  ): Promise<ArtworkSourceRecord | undefined> {
    const row = await this.prisma.personalization_sources.findFirst({
      where: {
        id: sourceId,
        owner_customer_identity_id: ownerCustomerIdentityId,
        status: { not: 'DELETED' },
      },
      select: SELECT,
    });
    return row === null ? undefined : toRecord(row);
  }

  updateLocked(
    sourceId: string,
    ownerCustomerIdentityId: string,
    decide: (record: ArtworkSourceRecord) => Promise<ArtworkState | undefined>,
  ): Promise<ArtworkSourceRecord | undefined> {
    return this.prisma.$transaction(async (tx: Tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`artwork:${sourceId}`}, 0))`;
      const row = await tx.personalization_sources.findFirst({
        where: {
          id: sourceId,
          owner_customer_identity_id: ownerCustomerIdentityId,
          status: { not: 'DELETED' },
        },
        select: SELECT,
      });
      if (row === null) {
        return undefined;
      }
      const record = toRecord(row);
      const next = await decide(record);
      if (next === undefined) {
        return record;
      }
      const current =
        next.currentVersionId === undefined
          ? undefined
          : next.versions[next.currentVersionId];
      const updated = await tx.personalization_sources.updateMany({
        where: { id: sourceId, status: 'READY' },
        data: {
          metadata_json: {
            ...asRecord(row.metadata_json),
            artwork: writeArtworkState(next),
          },
          ...(current === undefined
            ? {}
            : {
                vector_asset_key: current.svgKey,
                vector_checksum: current.svgSha256,
              }),
        },
      });
      if (updated.count !== 1) {
        throw new Error('Source left READY while its artwork was updated');
      }
      return { ...record, artwork: next };
    }, TX_OPTIONS);
  }
}

function toRecord(row: Row): ArtworkSourceRecord {
  const metadata = asRecord(row.metadata_json);
  const session = row.capture_sessions;
  const failureCode = metadata.failureCode;
  return {
    sourceId: row.id,
    sourceType: row.source_type,
    status: row.status,
    orderId:
      row.consents[0]?.order_id ??
      row.source_bindings[0]?.order_id ??
      session?.order_id ??
      undefined,
    sessionId: session?.id,
    attemptNo: session?.capture_attempts[0]?.attempt_no,
    ringItemIds: row.source_bindings.map((binding) => binding.ring_item_id),
    failureCode:
      typeof failureCode === 'string' && failureCode !== ''
        ? failureCode
        : undefined,
    artwork: readArtworkState(metadata),
  };
}

function asRecord(raw: unknown): Record<string, JsonValue> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, JsonValue>)
    : {};
}
