import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  EXPERIENCE_PACKAGE,
  PLATFORM_SHARING_SERVICE_NAME,
  type CreateShareLinkRequest,
  type CreateShareLinkResponse,
  type PlatformSharingServiceClient,
  type ResolveShareLinkRequest,
  type ResolveShareLinkResponse,
  type RevokeShareLinkRequest,
  type RevokeShareLinkResponse,
} from '@app/contracts';
import {
  DomainGrpcClient,
  domainGrpcClientOptions,
} from '../../../../common/grpc/domain-grpc';

export const EXPERIENCE_PLATFORM_SHARING_GRPC_CLIENT =
  'EXPERIENCE_PLATFORM_SHARING_GRPC_CLIENT';

export function experiencePlatformSharingGrpcClientOptions() {
  return domainGrpcClientOptions({
    name: EXPERIENCE_PLATFORM_SHARING_GRPC_CLIENT,
    urlConfigKey: 'apiGateway.experienceGrpcUrl',
    protoPackage: EXPERIENCE_PACKAGE,
    protoFile: 'experience/v1/platform.proto',
    optional: true,
  });
}

@Injectable()
export class PlatformSharingGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private platformSharingService!: PlatformSharingServiceClient;

  constructor(
    @Inject(EXPERIENCE_PLATFORM_SHARING_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.experienceInternalGrpcSecret');
  }

  onModuleInit(): void {
    this.platformSharingService =
      this.grpcClient.getService<PlatformSharingServiceClient>(
        PLATFORM_SHARING_SERVICE_NAME,
      );
  }

  resolveShareLink(
    request: ResolveShareLinkRequest,
  ): Promise<ResolveShareLinkResponse> {
    return this.unary((metadata) =>
      this.platformSharingService.resolveShareLink(request, metadata),
    );
  }

  createShareLink(
    request: CreateShareLinkRequest,
  ): Promise<CreateShareLinkResponse> {
    return this.unary((metadata) =>
      this.platformSharingService.createShareLink(request, metadata),
    );
  }

  revokeShareLink(
    request: RevokeShareLinkRequest,
  ): Promise<RevokeShareLinkResponse> {
    return this.unary((metadata) =>
      this.platformSharingService.revokeShareLink(request, metadata),
    );
  }
}
