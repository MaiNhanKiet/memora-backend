import type { AuditLogItem } from '@app/contracts';
import type { AuditLogRecord } from './audit.repository';

export function parseJsonRecord(raw?: string): Record<string, unknown> {
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

export function toAuditLogItem(log: AuditLogRecord): AuditLogItem {
  return {
    id: log.id,
    actorUserId: log.actorUserId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    requestId: log.requestId,
    traceId: log.traceId,
    resultStatus: log.resultStatus,
    changeSummaryJson: log.changeSummaryJson
      ? JSON.stringify(log.changeSummaryJson)
      : undefined,
    metadataJson: log.metadataJson
      ? JSON.stringify(log.metadataJson)
      : undefined,
    createdAt: log.createdAt.toISOString(),
  };
}
