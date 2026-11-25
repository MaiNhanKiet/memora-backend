import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PLATFORM_AUDIT_SERVICE_NAME,
  type ListAuditLogsRequest,
  type ListAuditLogsResponse,
  type PlatformAuditServiceGrpcController,
  type RecordAuditEventRequest,
  type RecordAuditEventResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import { AuditService } from '../application/audit.service';

@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class AuditGrpcController implements PlatformAuditServiceGrpcController {
  constructor(private readonly auditService: AuditService) {}

  @GrpcMethod(PLATFORM_AUDIT_SERVICE_NAME, 'ListAuditLogs')
  listAuditLogs(request: ListAuditLogsRequest): Promise<ListAuditLogsResponse> {
    return this.auditService.listAuditLogs(request);
  }

  @GrpcMethod(PLATFORM_AUDIT_SERVICE_NAME, 'RecordAuditEvent')
  recordAuditEvent(
    request: RecordAuditEventRequest,
  ): Promise<RecordAuditEventResponse> {
    return this.auditService.recordAuditEvent(request);
  }
}
