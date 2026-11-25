import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  audit_logs,
  Prisma,
} from '../../../../../generated/prisma/client';

export interface ListAuditLogsParams {
  actorUserId?: string;
  entityType?: string;
  action?: string;
  resultStatus?: string;
  fromDate?: Date;
  toDate?: Date;
  skip: number;
  take: number;
}

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(
    params: ListAuditLogsParams,
  ): Promise<{ items: audit_logs[]; total: number }> {
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

    return { items, total };
  }

  async createAuditLog(data: {
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    requestId?: string | null;
    traceId?: string | null;
    resultStatus?: string | null;
    changeSummaryJson?: Record<string, unknown>;
    metadataJson?: Record<string, unknown>;
  }): Promise<audit_logs> {
    return this.prisma.audit_logs.create({
      data: {
        actor_user_id: data.actorUserId,
        action: data.action,
        entity_type: data.entityType,
        entity_id: data.entityId,
        request_id: data.requestId,
        trace_id: data.traceId,
        result_status: data.resultStatus,
        change_summary_json:
          (data.changeSummaryJson as Prisma.InputJsonValue | undefined) ?? {},
        metadata_json:
          (data.metadataJson as Prisma.InputJsonValue | undefined) ?? {},
      },
    });
  }
}
