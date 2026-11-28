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
import {
  ListAuditLogsUseCase,
  RecordAuditEventUseCase,
} from '../application/audit.use-cases';

/** Thin gRPC adapter. Actor parsing and validation live in the use cases. */
@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class AuditGrpcController implements PlatformAuditServiceGrpcController {
  constructor(
    private readonly listAuditLogsUseCase: ListAuditLogsUseCase,
    private readonly recordAuditEventUseCase: RecordAuditEventUseCase,
  ) {}

  @GrpcMethod(PLATFORM_AUDIT_SERVICE_NAME, 'ListAuditLogs')
  listAuditLogs(request: ListAuditLogsRequest): Promise<ListAuditLogsResponse> {
    return this.listAuditLogsUseCase.execute(request);
  }

  @GrpcMethod(PLATFORM_AUDIT_SERVICE_NAME, 'RecordAuditEvent')
  recordAuditEvent(
    request: RecordAuditEventRequest,
  ): Promise<RecordAuditEventResponse> {
    return this.recordAuditEventUseCase.execute(request);
  }
}
