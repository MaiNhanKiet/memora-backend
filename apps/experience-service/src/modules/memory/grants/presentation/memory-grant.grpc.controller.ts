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
import {
  CreateAccessGrantUseCase,
  GetMemoryBySessionUseCase,
  ListAccessGrantsUseCase,
  RedeemInvitationUseCase,
  RevokeAccessGrantUseCase,
} from '../application/memory-grant.use-cases';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryGrantGrpcController {
  constructor(
    private readonly createAccessGrantUseCase: CreateAccessGrantUseCase,
    private readonly listAccessGrantsUseCase: ListAccessGrantsUseCase,
    private readonly revokeAccessGrantUseCase: RevokeAccessGrantUseCase,
    private readonly redeemInvitationUseCase: RedeemInvitationUseCase,
    private readonly getMemoryBySessionUseCase: GetMemoryBySessionUseCase,
  ) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'CreateAccessGrant')
  createAccessGrant(
    request: CreateAccessGrantRequest,
  ): Promise<CreateAccessGrantResponse> {
    return this.createAccessGrantUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListAccessGrants')
  listAccessGrants(
    request: ListAccessGrantsRequest,
  ): Promise<ListAccessGrantsResponse> {
    return this.listAccessGrantsUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'RevokeAccessGrant')
  revokeAccessGrant(
    request: RevokeAccessGrantRequest,
  ): Promise<RevokeAccessGrantResponse> {
    return this.revokeAccessGrantUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'RedeemInvitation')
  redeemInvitation(
    request: RedeemInvitationRequest,
  ): Promise<RedeemInvitationResponse> {
    return this.redeemInvitationUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetMemoryBySession')
  getMemoryBySession(
    request: GetMemoryBySessionRequest,
  ): Promise<GetMemoryBySessionResponse> {
    return this.getMemoryBySessionUseCase.execute(request);
  }
}
