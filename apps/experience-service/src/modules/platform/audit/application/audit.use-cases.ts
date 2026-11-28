import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor } from '@app/common';
import type {
  ListAuditLogsRequest,
  ListAuditLogsResponse,
  RecordAuditEventRequest,
  RecordAuditEventResponse,
} from '@app/contracts';
import { parseJsonRecord, toAuditLogItem } from './audit.mapper';
import { AUDIT_REPOSITORY, type AuditRepository } from './audit.repository';

@Injectable()
export class ListAuditLogsUseCase {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(request: ListAuditLogsRequest): Promise<ListAuditLogsResponse> {
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

    return {
      items: items.map(toAuditLogItem),
      total,
      page,
      limit,
      totalPages,
    };
  }
}

@Injectable()
export class RecordAuditEventUseCase {
  constructor(
    @Inject(AUDIT_REPOSITORY)
    private readonly auditRepository: AuditRepository,
  ) {}

  async execute(
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
      actorUserId: request.actorUserId || undefined,
      action: request.action,
      entityType: request.entityType,
      entityId: request.entityId || undefined,
      requestId: request.requestId || undefined,
      traceId: request.traceId || undefined,
      resultStatus: request.resultStatus || 'SUCCESS',
      changeSummaryJson: changeSummary,
      metadataJson: metadata,
    });

    return {
      id: created.id,
      createdAt: created.createdAt.toISOString(),
    };
  }
}
