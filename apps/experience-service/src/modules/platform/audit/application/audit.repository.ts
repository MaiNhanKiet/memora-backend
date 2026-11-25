export const AUDIT_REPOSITORY = Symbol('AUDIT_REPOSITORY');

export interface AuditLogRecord {
  readonly id: string;
  readonly actorUserId?: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly resultStatus?: string;
  readonly changeSummaryJson?: unknown;
  readonly metadataJson?: unknown;
  readonly createdAt: Date;
}

export interface ListAuditLogsParams {
  readonly actorUserId?: string;
  readonly entityType?: string;
  readonly action?: string;
  readonly resultStatus?: string;
  readonly fromDate?: Date;
  readonly toDate?: Date;
  readonly skip: number;
  readonly take: number;
}

export interface CreateAuditLogInput {
  readonly actorUserId?: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly resultStatus?: string;
  readonly changeSummaryJson?: Record<string, unknown>;
  readonly metadataJson?: Record<string, unknown>;
}

export interface AuditRepository {
  listAuditLogs(params: ListAuditLogsParams): Promise<{
    readonly items: readonly AuditLogRecord[];
    readonly total: number;
  }>;
  createAuditLog(data: CreateAuditLogInput): Promise<AuditLogRecord>;
}
