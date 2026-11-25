import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PlatformAuditGrpcClient } from '../clients/platform-audit-grpc.client';
import { ApiListAuditLogsDocs } from '../docs/admin-audit.swagger';
import { ListAuditLogsQueryDto, ListAuditLogsResponseDto } from '../dto';
import {
  toListAuditLogsGrpcRequest,
  toListAuditLogsResponseDto,
} from '../mappers/admin-audit-http.mapper';

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

    const res = await this.platformAuditClient.listAuditLogs(
      toListAuditLogsGrpcRequest(actor, query),
    );

    return toListAuditLogsResponseDto(res);
  }
}
