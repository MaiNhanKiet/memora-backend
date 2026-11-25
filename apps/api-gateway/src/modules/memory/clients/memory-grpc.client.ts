import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import {
  EXPERIENCE_PACKAGE,
  MEMORY_SERVICE_NAME,
  type ActivateCardRequest,
  type ChangePinRequest,
  type ChangePinResponse,
  type CreateAccessGrantRequest,
  type CreateAccessGrantResponse,
  type GetCardByRingItemIdRequest,
  type GetCardDetailRequest,
  type GetMemoryBySessionRequest,
  type GetMemoryBySessionResponse,
  type InitiateMediaUploadRequest,
  type InitiateMediaUploadResponse,
  type ListAccessGrantsRequest,
  type ListAccessGrantsResponse,
  type ListCardContentsRequest,
  type ListCardContentsResponse,
  type ListMyCardsRequest,
  type ListMyCardsResponse,
  type MemoryCardDetailResponse,
  type MemoryServiceClient,
  type ProvisionMemoryCardRequest,
  type RedeemInvitationRequest,
  type RedeemInvitationResponse,
  type ResetPinRequest,
  type ResetPinResponse,
  type RevokeAccessGrantRequest,
  type RevokeAccessGrantResponse,
  type SetupPinRequest,
  type SetupPinResponse,
  type UpdateCardContentsRequest,
  type UpdateCardContentsResponse,
} from '@app/contracts';
import {
  DomainGrpcClient,
  domainGrpcClientOptions,
} from '../../../common/grpc/domain-grpc';

export const EXPERIENCE_MEMORY_GRPC_CLIENT = 'EXPERIENCE_MEMORY_GRPC_CLIENT';

export function experienceMemoryGrpcClientOptions() {
  return domainGrpcClientOptions({
    name: EXPERIENCE_MEMORY_GRPC_CLIENT,
    urlConfigKey: 'apiGateway.experienceGrpcUrl',
    protoPackage: EXPERIENCE_PACKAGE,
    protoFile: 'experience/v1/memory.proto',
    optional: true,
  });
}

@Injectable()
export class MemoryGrpcClient extends DomainGrpcClient implements OnModuleInit {
  private memoryService!: MemoryServiceClient;

  constructor(
    @Inject(EXPERIENCE_MEMORY_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.experienceInternalGrpcSecret', {
      optional: true,
    });
  }

  onModuleInit(): void {
    this.memoryService =
      this.grpcClient.getService<MemoryServiceClient>(MEMORY_SERVICE_NAME);
  }

  // Memory Cards
  listMyCards(request: ListMyCardsRequest): Promise<ListMyCardsResponse> {
    return this.unary((metadata) =>
      this.memoryService.listMyCards(request, metadata),
    );
  }

  getCardDetail(
    request: GetCardDetailRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.unary((metadata) =>
      this.memoryService.getCardDetail(request, metadata),
    );
  }

  activateCard(
    request: ActivateCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.unary((metadata) =>
      this.memoryService.activateCard(request, metadata),
    );
  }

  provisionMemoryCard(
    request: ProvisionMemoryCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.unary((metadata) =>
      this.memoryService.provisionMemoryCard(request, metadata),
    );
  }

  getCardByRingItemId(
    request: GetCardByRingItemIdRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.unary((metadata) =>
      this.memoryService.getCardByRingItemId(request, metadata),
    );
  }

  // PIN Protection
  setupPin(request: SetupPinRequest): Promise<SetupPinResponse> {
    return this.unary((metadata) =>
      this.memoryService.setupPin(request, metadata),
    );
  }

  changePin(request: ChangePinRequest): Promise<ChangePinResponse> {
    return this.unary((metadata) =>
      this.memoryService.changePin(request, metadata),
    );
  }

  resetPin(request: ResetPinRequest): Promise<ResetPinResponse> {
    return this.unary((metadata) =>
      this.memoryService.resetPin(request, metadata),
    );
  }

  // Memory Contents & Media Upload
  listCardContents(
    request: ListCardContentsRequest,
  ): Promise<ListCardContentsResponse> {
    return this.unary((metadata) =>
      this.memoryService.listCardContents(request, metadata),
    );
  }

  updateCardContents(
    request: UpdateCardContentsRequest,
  ): Promise<UpdateCardContentsResponse> {
    return this.unary((metadata) =>
      this.memoryService.updateCardContents(request, metadata),
    );
  }

  initiateMediaUpload(
    request: InitiateMediaUploadRequest,
  ): Promise<InitiateMediaUploadResponse> {
    return this.unary((metadata) =>
      this.memoryService.initiateMediaUpload(request, metadata),
    );
  }

  // Access Grants & Web Session Access
  createAccessGrant(
    request: CreateAccessGrantRequest,
  ): Promise<CreateAccessGrantResponse> {
    return this.unary((metadata) =>
      this.memoryService.createAccessGrant(request, metadata),
    );
  }

  listAccessGrants(
    request: ListAccessGrantsRequest,
  ): Promise<ListAccessGrantsResponse> {
    return this.unary((metadata) =>
      this.memoryService.listAccessGrants(request, metadata),
    );
  }

  revokeAccessGrant(
    request: RevokeAccessGrantRequest,
  ): Promise<RevokeAccessGrantResponse> {
    return this.unary((metadata) =>
      this.memoryService.revokeAccessGrant(request, metadata),
    );
  }

  redeemInvitation(
    request: RedeemInvitationRequest,
  ): Promise<RedeemInvitationResponse> {
    return this.unary((metadata) =>
      this.memoryService.redeemInvitation(request, metadata),
    );
  }

  getMemoryBySession(
    request: GetMemoryBySessionRequest,
  ): Promise<GetMemoryBySessionResponse> {
    return this.unary((metadata) =>
      this.memoryService.getMemoryBySession(request, metadata),
    );
  }
}
