import type {
  ListAuditLogsRequest,
  ListAuditLogsResponse,
  VerifiedActor,
} from '@app/contracts';
import type {
  AuditLogItemDto,
  ListAuditLogsQueryDto,
  ListAuditLogsResponseDto,
} from '../dto';

function parseOptionalJsonRecord(
  raw?: string,
): Record<string, unknown> | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function toListAuditLogsGrpcRequest(
  actor: VerifiedActor,
  query: ListAuditLogsQueryDto,
): ListAuditLogsRequest {
  return {
    actor,
    actorUserId: query.actorUserId,
    entityType: query.entityType,
    action: query.action,
    resultStatus: query.resultStatus,
    fromDate: query.fromDate,
    toDate: query.toDate,
    page: query.page,
    limit: query.limit,
  };
}

export function toListAuditLogsResponseDto(
  res: ListAuditLogsResponse,
): ListAuditLogsResponseDto {
  const items: AuditLogItemDto[] = (res.items ?? []).map((item) => ({
    id: item.id,
    actorUserId: item.actorUserId || undefined,
    action: item.action,
    entityType: item.entityType,
    entityId: item.entityId || undefined,
    requestId: item.requestId || undefined,
    traceId: item.traceId || undefined,
    resultStatus: item.resultStatus || undefined,
    changeSummary: parseOptionalJsonRecord(item.changeSummaryJson),
    metadata: parseOptionalJsonRecord(item.metadataJson),
    createdAt: item.createdAt,
  }));

  return {
    items,
    meta: {
      page: res.page,
      limit: res.limit,
      total: res.total,
      totalPages: res.totalPages,
    },
  };
}
