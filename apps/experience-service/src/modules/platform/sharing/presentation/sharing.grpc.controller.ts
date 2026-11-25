import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PLATFORM_SHARING_SERVICE_NAME,
  type CreateShareLinkRequest,
  type CreateShareLinkResponse,
  type PlatformSharingServiceGrpcController,
  type ResolveShareLinkRequest,
  type ResolveShareLinkResponse,
  type RevokeShareLinkRequest,
  type RevokeShareLinkResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import {
  CreateShareLinkUseCase,
  ResolveShareLinkUseCase,
  RevokeShareLinkUseCase,
} from '../application/sharing.use-cases';

/** Thin gRPC adapter. Actor parsing and ownership authorization live in the use cases. */
@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class SharingGrpcController implements PlatformSharingServiceGrpcController {
  constructor(
    private readonly resolveShareLinkUseCase: ResolveShareLinkUseCase,
    private readonly createShareLinkUseCase: CreateShareLinkUseCase,
    private readonly revokeShareLinkUseCase: RevokeShareLinkUseCase,
  ) {}

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'ResolveShareLink')
  resolveShareLink(
    request: ResolveShareLinkRequest,
  ): Promise<ResolveShareLinkResponse> {
    return this.resolveShareLinkUseCase.execute(request);
  }

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'CreateShareLink')
  createShareLink(
    request: CreateShareLinkRequest,
  ): Promise<CreateShareLinkResponse> {
    return this.createShareLinkUseCase.execute(request);
  }

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'RevokeShareLink')
  revokeShareLink(
    request: RevokeShareLinkRequest,
  ): Promise<RevokeShareLinkResponse> {
    return this.revokeShareLinkUseCase.execute(request);
  }
}
