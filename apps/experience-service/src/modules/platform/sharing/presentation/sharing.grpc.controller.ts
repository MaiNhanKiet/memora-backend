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
import { SharingService } from '../application/sharing.service';

@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class SharingGrpcController implements PlatformSharingServiceGrpcController {
  constructor(private readonly sharingService: SharingService) {}

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'ResolveShareLink')
  resolveShareLink(
    request: ResolveShareLinkRequest,
  ): Promise<ResolveShareLinkResponse> {
    return this.sharingService.resolveShareLink(request);
  }

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'CreateShareLink')
  createShareLink(
    request: CreateShareLinkRequest,
  ): Promise<CreateShareLinkResponse> {
    return this.sharingService.createShareLink(request);
  }

  @GrpcMethod(PLATFORM_SHARING_SERVICE_NAME, 'RevokeShareLink')
  revokeShareLink(
    request: RevokeShareLinkRequest,
  ): Promise<RevokeShareLinkResponse> {
    return this.sharingService.revokeShareLink(request);
  }
}
