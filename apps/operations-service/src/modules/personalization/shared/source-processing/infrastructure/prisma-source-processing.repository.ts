import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../persistence/prisma/prisma.service';
import type {
  JsonValue,
  ProcessableSource,
  SaveReadyInput,
  SaveSoundwaveOutcome,
  SaveSoundwaveReadyInput,
  SourceProcessingRepository,
} from '../application/source-processing.repository';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

const WAVECODE_LOCK = 'wavecode';

@Injectable()
export class PrismaSourceProcessingRepository implements SourceProcessingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(sourceId: string): Promise<ProcessableSource | undefined> {
    const row = await this.prisma.personalization_sources.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        source_type: true,
        status: true,
        raw_asset_key: true,
        metadata_json: true,
      },
    });
    if (row === null) {
      return undefined;
    }
    return {
      id: row.id,
      sourceType: row.source_type,
      status: row.status,
      rawAssetKey: row.raw_asset_key ?? undefined,
      metadata: asRecord(row.metadata_json),
    };
  }

  startProcessing(sourceId: string, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.personalization_sources.findFirst({
        where: { id: sourceId, status: 'ACCEPTED' },
        select: { metadata_json: true },
      });
      if (row === null) {
        return false;
      }
      const updated = await tx.personalization_sources.updateMany({
        where: { id: sourceId, status: 'ACCEPTED' },
        data: {
          status: 'PROCESSING',
          metadata_json: {
            ...asRecord(row.metadata_json),
            processingStartedAt: now.toISOString(),
          },
        },
      });
      return updated.count === 1;
    });
  }

  saveReady(input: SaveReadyInput): Promise<boolean> {
    return this.prisma.$transaction((tx) => this.writeReady(tx, input));
  }

  saveSoundwaveReady(
    input: SaveSoundwaveReadyInput,
  ): Promise<SaveSoundwaveOutcome> {
    return this.prisma.$transaction(async (tx) => {
      // One writer at a time decides which WAVECODE is free.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${WAVECODE_LOCK}, 0))`;
      const current = await tx.personalization_sources.findFirst({
        where: { id: input.sourceId, status: 'PROCESSING' },
        select: { id: true },
      });
      if (current === null) {
        return 'NOT_PROCESSING';
      }
      const clash = await tx.personalization_sources.findFirst({
        where: {
          id: { not: input.sourceId },
          source_type: 'SOUNDWAVE',
          status: { not: 'DELETED' },
          metadata_json: {
            path: ['wavecode', 'levels'],
            equals: [...input.levels],
          },
        },
        select: { id: true },
      });
      if (clash !== null) {
        return 'COLLISION';
      }
      return (await this.writeReady(tx, input)) ? 'SAVED' : 'NOT_PROCESSING';
    });
  }

  async findUsedLevels(
    sourceId: string,
    candidates: readonly (readonly number[])[],
  ): Promise<readonly (readonly number[])[]> {
    if (candidates.length === 0) {
      return [];
    }
    const rows = await this.prisma.personalization_sources.findMany({
      where: {
        id: { not: sourceId },
        source_type: 'SOUNDWAVE',
        status: { not: 'DELETED' },
        OR: candidates.map((levels) => ({
          metadata_json: {
            path: ['wavecode', 'levels'],
            equals: [...levels],
          },
        })),
      },
      select: { metadata_json: true },
    });
    const used: number[][] = [];
    for (const row of rows) {
      const wavecode = asRecord(asRecord(row.metadata_json).wavecode);
      const levels = wavecode.levels;
      if (Array.isArray(levels) && levels.every((v) => typeof v === 'number')) {
        used.push(levels);
      }
    }
    return used;
  }

  markFailed(
    sourceId: string,
    failureCode: string,
    now: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.personalization_sources.findFirst({
        where: { id: sourceId, status: 'PROCESSING' },
        select: { metadata_json: true },
      });
      if (row === null) {
        return false;
      }
      const updated = await tx.personalization_sources.updateMany({
        where: { id: sourceId, status: 'PROCESSING' },
        data: {
          status: 'PROCESSING_FAILED',
          metadata_json: {
            ...asRecord(row.metadata_json),
            failureCode,
            failedAt: now.toISOString(),
          },
        },
      });
      return updated.count === 1;
    });
  }

  /** Conditional on PROCESSING; keeps the existing metadata and merges the new fields. */
  private async writeReady(tx: Tx, input: SaveReadyInput): Promise<boolean> {
    const row = await tx.personalization_sources.findFirst({
      where: { id: input.sourceId, status: 'PROCESSING' },
      select: { metadata_json: true },
    });
    if (row === null) {
      return false;
    }
    const merged: Record<string, JsonValue> = {
      ...asRecord(row.metadata_json),
      ...input.metadata,
    };
    const updated = await tx.personalization_sources.updateMany({
      where: { id: input.sourceId, status: 'PROCESSING' },
      data: {
        status: 'READY',
        processed_asset_key: input.manifestKey,
        vector_asset_key: input.vectorKey,
        vector_checksum: input.vectorSha256,
        metadata_json: merged,
      },
    });
    return updated.count === 1;
  }
}

function asRecord(raw: unknown): Record<string, JsonValue> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, JsonValue>)
    : {};
}
