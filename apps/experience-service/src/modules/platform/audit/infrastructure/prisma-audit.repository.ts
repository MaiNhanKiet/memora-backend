import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  audit_logs,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  AuditLogRecord,
  AuditRepository,
  CreateAuditLogInput,
  ListAuditLogsParams,
} from '../application/audit.repository';

function toAuditLogRecord(row: audit_logs): AuditLogRecord {
  return {
    id: row.id,
    actorUserId: row.actor_user_id ?? undefined,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? undefined,
    requestId: row.request_id ?? undefined,
    traceId: row.trace_id ?? undefined,
    resultStatus: row.result_status ?? undefined,
    changeSummaryJson: row.change_summary_json ?? undefined,
    metadataJson: row.metadata_json ?? undefined,
    createdAt: row.created_at,
  };
}

@Injectable()
export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(params: ListAuditLogsParams): Promise<{
    readonly items: readonly AuditLogRecord[];
    readonly total: number;
  }> {
    const where: Prisma.audit_logsWhereInput = {};

    if (params.actorUserId) {
      where.actor_user_id = params.actorUserId;
    }
    if (params.entityType) {
      where.entity_type = params.entityType;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.resultStatus) {
      where.result_status = params.resultStatus;
    }

    if (params.fromDate || params.toDate) {
      where.created_at = {};
      if (params.fromDate) {
        where.created_at.gte = params.fromDate;
      }
      if (params.toDate) {
        where.created_at.lte = params.toDate;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.audit_logs.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.audit_logs.count({ where }),
    ]);

    return { items: items.map(toAuditLogRecord), total };
  }

  async createAuditLog(data: CreateAuditLogInput): Promise<AuditLogRecord> {
    const created = await this.prisma.audit_logs.create({
      data: {
        actor_user_id: data.actorUserId ?? null,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId ?? null,
        request_id: data.requestId ?? null,
        trace_id: data.traceId ?? null,
        result_status: data.resultStatus ?? null,
        change_summary_json:
          (data.changeSummaryJson as Prisma.InputJsonValue | undefined) ?? {},
        metadata_json:
          (data.metadataJson as Prisma.InputJsonValue | undefined) ?? {},
      },
    });
    return toAuditLogRecord(created);
  }
}
