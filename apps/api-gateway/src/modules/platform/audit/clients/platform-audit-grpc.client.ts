import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  EXPERIENCE_PACKAGE,
  PLATFORM_AUDIT_SERVICE_NAME,
  type ListAuditLogsRequest,
  type ListAuditLogsResponse,
  type PlatformAuditServiceClient,
  type RecordAuditEventRequest,
  type RecordAuditEventResponse,
} from '@app/contracts';
import {
  DomainGrpcClient,
  domainGrpcClientOptions,
} from '../../../../common/grpc/domain-grpc';

export const EXPERIENCE_PLATFORM_AUDIT_GRPC_CLIENT =
  'EXPERIENCE_PLATFORM_AUDIT_GRPC_CLIENT';

export function experiencePlatformAuditGrpcClientOptions() {
  return domainGrpcClientOptions({
    name: EXPERIENCE_PLATFORM_AUDIT_GRPC_CLIENT,
    urlConfigKey: 'apiGateway.experienceGrpcUrl',
    protoPackage: EXPERIENCE_PACKAGE,
    protoFile: 'experience/v1/platform.proto',
    optional: true,
  });
}

@Injectable()
export class PlatformAuditGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private platformAuditService!: PlatformAuditServiceClient;

  constructor(
    @Inject(EXPERIENCE_PLATFORM_AUDIT_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.experienceInternalGrpcSecret');
  }

  onModuleInit(): void {
    this.platformAuditService =
      this.grpcClient.getService<PlatformAuditServiceClient>(
        PLATFORM_AUDIT_SERVICE_NAME,
      );
  }

  listAuditLogs(request: ListAuditLogsRequest): Promise<ListAuditLogsResponse> {
    return this.unary((metadata) =>
      this.platformAuditService.listAuditLogs(request, metadata),
    );
  }

  recordAuditEvent(
    request: RecordAuditEventRequest,
  ): Promise<RecordAuditEventResponse> {
    return this.unary((metadata) =>
      this.platformAuditService.recordAuditEvent(request, metadata),
    );
  }
}
