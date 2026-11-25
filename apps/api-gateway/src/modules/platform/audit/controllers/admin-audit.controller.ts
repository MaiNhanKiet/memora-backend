import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PlatformAuditGrpcClient } from '../clients/platform-audit-grpc.client';
import { ApiListAuditLogsDocs } from '../docs/admin-audit.swagger';
import {
  AuditLogItemDto,
  ListAuditLogsQueryDto,
  ListAuditLogsResponseDto,
} from '../dto';

@ApiTags('Platform - Admin Audit Logs')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly platformAuditClient: PlatformAuditGrpcClient) {}

  // ---------------------------------------------------------------------------
  // [PLATF-017] GET /api/v1/admin/audit-logs
  // ---------------------------------------------------------------------------
  @Get()
  @RequirePermissions(PERMISSIONS.IAM_SECURITY_AUDIT_READ)
  @ApiListAuditLogsDocs()
  async listAuditLogs(
    @Query() query: ListAuditLogsQueryDto,
    @CurrentUser() user: AuthenticatedPrincipal,
  ): Promise<ListAuditLogsResponseDto> {
    const actor = toVerifiedActor(user);

    const res = await this.platformAuditClient.listAuditLogs({
      actor,
      actorUserId: query.actorUserId,
      entityType: query.entityType,
      action: query.action,
      resultStatus: query.resultStatus,
      fromDate: query.fromDate,
      toDate: query.toDate,
      page: query.page,
      limit: query.limit,
    });

    const mappedItems: AuditLogItemDto[] = (res.items ?? []).map((item) => {
      let changeSummary: Record<string, unknown> | undefined;
      if (item.changeSummaryJson) {
        try {
          changeSummary = JSON.parse(item.changeSummaryJson) as Record<
            string,
            unknown
          >;
        } catch {
          changeSummary = undefined;
        }
      }

      let metadata: Record<string, unknown> | undefined;
      if (item.metadataJson) {
        try {
          metadata = JSON.parse(item.metadataJson) as Record<string, unknown>;
        } catch {
          metadata = undefined;
        }
      }

      return {
        id: item.id,
        actorUserId: item.actorUserId || undefined,
        action: item.action,
        entityType: item.entityType,
        entityId: item.entityId || undefined,
        requestId: item.requestId || undefined,
        traceId: item.traceId || undefined,
        resultStatus: item.resultStatus || undefined,
        changeSummary,
        metadata,
        createdAt: item.createdAt,
      };
    });

    return {
      items: mappedItems,
      meta: {
        page: res.page,
        limit: res.limit,
        total: res.total,
        totalPages: res.totalPages,
      },
    };
  }
}
