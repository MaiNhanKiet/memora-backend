import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  MEMORY_SERVICE_NAME,
  type CreateAccessGrantRequest,
  type CreateAccessGrantResponse,
  type GetMemoryBySessionRequest,
  type GetMemoryBySessionResponse,
  type ListAccessGrantsRequest,
  type ListAccessGrantsResponse,
  type RedeemInvitationRequest,
  type RedeemInvitationResponse,
  type RevokeAccessGrantRequest,
  type RevokeAccessGrantResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import { MemoryGrantService } from '../application/memory-grant.service';

@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryGrantGrpcController {
  constructor(private readonly grantService: MemoryGrantService) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'CreateAccessGrant')
  createAccessGrant(
    request: CreateAccessGrantRequest,
  ): Promise<CreateAccessGrantResponse> {
    return this.grantService.createAccessGrant(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListAccessGrants')
  listAccessGrants(
    request: ListAccessGrantsRequest,
  ): Promise<ListAccessGrantsResponse> {
    return this.grantService.listAccessGrants(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'RevokeAccessGrant')
  revokeAccessGrant(
    request: RevokeAccessGrantRequest,
  ): Promise<RevokeAccessGrantResponse> {
    return this.grantService.revokeAccessGrant(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'RedeemInvitation')
  redeemInvitation(
    request: RedeemInvitationRequest,
  ): Promise<RedeemInvitationResponse> {
    return this.grantService.redeemInvitation(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetMemoryBySession')
  getMemoryBySession(
    request: GetMemoryBySessionRequest,
  ): Promise<GetMemoryBySessionResponse> {
    return this.grantService.getMemoryBySession(request);
  }
}
