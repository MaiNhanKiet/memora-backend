import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type { JsonValue } from '../../shared/source-processing/application/source-processing.repository';
import {
  knownStyle,
  readWavecodeState,
  writeWavecodeState,
} from '../../shared/source-processing/application/wavecode-state';
import type { WavecodeState } from '../../shared/source-processing/application/wavecode-state';
import type {
  ResegmentOutcome,
  ResegmentPlan,
  WavecodeRepository,
  WavecodeSourceRecord,
} from '../application/wavecode.repository';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const SELECT = {
  id: true,
  source_type: true,
  status: true,
  raw_asset_key: true,
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
} as const;

interface Row {
  readonly id: string;
  readonly source_type: string;
  readonly status: string;
  readonly raw_asset_key: string | null;
  readonly metadata_json: unknown;
  readonly consents: readonly { order_id: string | null }[];
  readonly source_bindings: readonly {
    order_id: string;
    ring_item_id: string;
  }[];
}

/** A long worker call may run inside the transaction (render is capped at 30 s). */
const TX_OPTIONS = { timeout: 60_000, maxWait: 10_000 };

/** Result fields a new processing run must not see (PERSO-035). */
const RESET_METADATA_KEYS = [
  'wavecode',
  'failureCode',
  'failedAt',
  'processingStartedAt',
  'processedAt',
  'audioSegmentKey',
] as const;

@Injectable()
export class PrismaWavecodeRepository implements WavecodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    sourceId: string,
    ownerCustomerIdentityId: string,
  ): Promise<WavecodeSourceRecord | undefined> {
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
    decide: (
      record: WavecodeSourceRecord,
    ) => Promise<WavecodeState | undefined>,
  ): Promise<WavecodeSourceRecord | undefined> {
    return this.prisma.$transaction(async (tx: Tx) => {
      const row = await lockedRow(tx, sourceId, ownerCustomerIdentityId);
      if (row === null) {
        return undefined;
      }
      const record = toRecord(row);
      const next = await decide(record);
      if (next === undefined) {
        return record;
      }
      const current = next.styles[next.style];
      const updated = await tx.personalization_sources.updateMany({
        where: { id: sourceId, status: 'READY' },
        data: {
          metadata_json: {
            ...asRecord(row.metadata_json),
            wavecode: writeWavecodeState(next),
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
        throw new Error('Source left READY while its wavecode was updated');
      }
      return { ...record, wavecode: next };
    }, TX_OPTIONS);
  }

  resegment(
    sourceId: string,
    ownerCustomerIdentityId: string,
    plan: (record: WavecodeSourceRecord) => ResegmentPlan,
  ): Promise<ResegmentOutcome | undefined> {
    return this.prisma.$transaction(async (tx: Tx) => {
      const row = await lockedRow(tx, sourceId, ownerCustomerIdentityId);
      if (row === null) {
        return undefined;
      }
      const before = toRecord(row);
      const { segmentStartMs, wavecodeStyle } = plan(before);
      const revision = before.revision + 1;
      const resegmentCount = before.resegmentCount + 1;

      const metadata: Record<string, JsonValue> = {
        ...asRecord(row.metadata_json),
      };
      for (const key of RESET_METADATA_KEYS) {
        delete metadata[key];
      }
      metadata.segmentStartMs = segmentStartMs;
      metadata.wavecodeStyle = wavecodeStyle;
      metadata.revision = revision;
      metadata.resegmentCount = resegmentCount;

      // Conditional on the status read under the lock. The vector key and checksum are
      // cleared together (CHECK: both null or both set).
      const updated = await tx.personalization_sources.updateMany({
        where: { id: sourceId, status: before.status },
        data: {
          status: 'ACCEPTED',
          metadata_json: metadata,
          processed_asset_key: null,
          vector_asset_key: null,
          vector_checksum: null,
        },
      });
      if (updated.count !== 1) {
        throw new Error('Source changed status while it was re-segmented');
      }
      return {
        before,
        after: {
          ...before,
          status: 'ACCEPTED',
          wavecode: undefined,
          failureCode: undefined,
          segmentStartMs,
          wavecodeStyle,
          audioSegmentKey: undefined,
          revision,
          resegmentCount,
        },
      };
    }, TX_OPTIONS);
  }
}

/** Takes the advisory lock `wavecode-style:{sourceId}` and re-reads the owner's source. */
async function lockedRow(
  tx: Tx,
  sourceId: string,
  ownerCustomerIdentityId: string,
): Promise<Row | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`wavecode-style:${sourceId}`}, 0))`;
  return tx.personalization_sources.findFirst({
    where: {
      id: sourceId,
      owner_customer_identity_id: ownerCustomerIdentityId,
      status: { not: 'DELETED' },
    },
    select: SELECT,
  });
}

function toRecord(row: Row): WavecodeSourceRecord {
  const metadata = asRecord(row.metadata_json);
  return {
    sourceId: row.id,
    sourceType: row.source_type,
    status: row.status,
    orderId:
      row.consents[0]?.order_id ??
      row.source_bindings[0]?.order_id ??
      undefined,
    ringItemIds: row.source_bindings.map((binding) => binding.ring_item_id),
    rawAssetKey: row.raw_asset_key ?? undefined,
    contentType: str(metadata.contentType),
    failureCode: str(metadata.failureCode),
    declaredDurationMs: num(metadata.durationMs),
    measuredDurationMs: num(metadata.measuredDurationMs),
    segmentStartMs: num(metadata.segmentStartMs),
    audioSegmentKey: str(metadata.audioSegmentKey),
    wavecodeStyle: knownStyle(metadata.wavecodeStyle),
    revision: num(metadata.revision) ?? 0,
    resegmentCount: num(metadata.resegmentCount) ?? 0,
    wavecode: readWavecodeState(metadata),
  };
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function asRecord(raw: unknown): Record<string, JsonValue> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, JsonValue>)
    : {};
}
