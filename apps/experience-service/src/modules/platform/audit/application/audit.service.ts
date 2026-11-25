import { BadRequestException, Injectable } from '@nestjs/common';
import { parseVerifiedActor } from '@app/common';
import type {
  AuditLogItem,
  ListAuditLogsRequest,
  ListAuditLogsResponse,
  RecordAuditEventRequest,
  RecordAuditEventResponse,
} from '@app/contracts';
import { AuditRepository } from '../infrastructure/audit.repository';

function parseJsonRecord(raw?: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async listAuditLogs(
    request: ListAuditLogsRequest,
  ): Promise<ListAuditLogsResponse> {
    // Validate actor format
    parseVerifiedActor(request.actor);

    let fromDate: Date | undefined;
    if (request.fromDate) {
      fromDate = new Date(request.fromDate);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid fromDate parameter');
      }
    }

    let toDate: Date | undefined;
    if (request.toDate) {
      toDate = new Date(request.toDate);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid toDate parameter');
      }
    }

    const page = Math.max(1, request.page ?? 1);
    const limit = Math.max(1, Math.min(100, request.limit ?? 20));
    const skip = (page - 1) * limit;

    const { items, total } = await this.auditRepository.listAuditLogs({
      actorUserId: request.actorUserId || undefined,
      entityType: request.entityType || undefined,
      action: request.action || undefined,
      resultStatus: request.resultStatus || undefined,
      fromDate,
      toDate,
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit) || 1;

    const mappedItems: AuditLogItem[] = items.map((log) => ({
      id: log.id,
      actorUserId: log.actor_user_id ?? undefined,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id ?? undefined,
      requestId: log.request_id ?? undefined,
      traceId: log.trace_id ?? undefined,
      resultStatus: log.result_status ?? undefined,
      changeSummaryJson: log.change_summary_json
        ? JSON.stringify(log.change_summary_json)
        : undefined,
      metadataJson: log.metadata_json
        ? JSON.stringify(log.metadata_json)
        : undefined,
      createdAt: log.created_at.toISOString(),
    }));

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async recordAuditEvent(
    request: RecordAuditEventRequest,
  ): Promise<RecordAuditEventResponse> {
    if (!request.action || !request.entityType) {
      throw new BadRequestException(
        'Action and entityType are required for audit event',
      );
    }

    const changeSummary = parseJsonRecord(request.changeSummaryJson);
    const metadata = parseJsonRecord(request.metadataJson);

    const created = await this.auditRepository.createAuditLog({
      actorUserId: request.actorUserId || null,
      action: request.action,
      entityType: request.entityType,
      entityId: request.entityId || null,
      requestId: request.requestId || null,
      traceId: request.traceId || null,
      resultStatus: request.resultStatus || 'SUCCESS',
      changeSummaryJson: changeSummary,
      metadataJson: metadata,
    });

    return {
      id: created.id,
      createdAt: created.created_at.toISOString(),
    };
  }
}
