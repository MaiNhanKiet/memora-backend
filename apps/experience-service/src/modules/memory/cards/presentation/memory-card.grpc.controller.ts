import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  MEMORY_SERVICE_NAME,
  type ActivateCardRequest,
  type ChangePinRequest,
  type ChangePinResponse,
  type GetCardByRingItemIdRequest,
  type GetCardDetailRequest,
  type ListMyCardsRequest,
  type ListMyCardsResponse,
  type MemoryCardDetailResponse,
  type ProvisionMemoryCardRequest,
  type ResetPinRequest,
  type ResetPinResponse,
  type SetupPinRequest,
  type SetupPinResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import { MemoryCardService } from '../application/memory-card.service';

@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryCardGrpcController {
  constructor(private readonly memoryCardService: MemoryCardService) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListMyCards')
  listMyCards(request: ListMyCardsRequest): Promise<ListMyCardsResponse> {
    return this.memoryCardService.listMyCards(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetCardDetail')
  getCardDetail(
    request: GetCardDetailRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.memoryCardService.getCardDetail(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ActivateCard')
  activateCard(
    request: ActivateCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.memoryCardService.activateCard(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ProvisionMemoryCard')
  provisionMemoryCard(
    request: ProvisionMemoryCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.memoryCardService.provisionMemoryCard(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetCardByRingItemId')
  getCardByRingItemId(
    request: GetCardByRingItemIdRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.memoryCardService.getCardByRingItemId(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'SetupPin')
  setupPin(request: SetupPinRequest): Promise<SetupPinResponse> {
    return this.memoryCardService.setupPin(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ChangePin')
  changePin(request: ChangePinRequest): Promise<ChangePinResponse> {
    return this.memoryCardService.changePin(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ResetPin')
  resetPin(request: ResetPinRequest): Promise<ResetPinResponse> {
    return this.memoryCardService.resetPin(request);
  }
}
