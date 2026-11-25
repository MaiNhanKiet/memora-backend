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
  type MemoryServiceHandler,
  type ProvisionMemoryCardRequest,
  type ResetPinRequest,
  type ResetPinResponse,
  type SetupPinRequest,
  type SetupPinResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import {
  ActivateCardUseCase,
  ProvisionMemoryCardUseCase,
} from '../application/card-lifecycle.use-cases';
import {
  ChangePinUseCase,
  ResetPinUseCase,
  SetupPinUseCase,
} from '../application/card-pin.use-cases';
import {
  GetCardByRingItemIdUseCase,
  GetCardDetailUseCase,
  ListMyCardsUseCase,
} from '../application/card-query.use-cases';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryCardGrpcController implements Pick<
  MemoryServiceHandler,
  | 'listMyCards'
  | 'getCardDetail'
  | 'activateCard'
  | 'provisionMemoryCard'
  | 'getCardByRingItemId'
  | 'setupPin'
  | 'changePin'
  | 'resetPin'
> {
  constructor(
    private readonly listMyCardsUseCase: ListMyCardsUseCase,
    private readonly getCardDetailUseCase: GetCardDetailUseCase,
    private readonly activateCardUseCase: ActivateCardUseCase,
    private readonly provisionMemoryCardUseCase: ProvisionMemoryCardUseCase,
    private readonly getCardByRingItemIdUseCase: GetCardByRingItemIdUseCase,
    private readonly setupPinUseCase: SetupPinUseCase,
    private readonly changePinUseCase: ChangePinUseCase,
    private readonly resetPinUseCase: ResetPinUseCase,
  ) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListMyCards')
  listMyCards(request: ListMyCardsRequest): Promise<ListMyCardsResponse> {
    return this.listMyCardsUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetCardDetail')
  getCardDetail(
    request: GetCardDetailRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.getCardDetailUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ActivateCard')
  activateCard(
    request: ActivateCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.activateCardUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ProvisionMemoryCard')
  provisionMemoryCard(
    request: ProvisionMemoryCardRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.provisionMemoryCardUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'GetCardByRingItemId')
  getCardByRingItemId(
    request: GetCardByRingItemIdRequest,
  ): Promise<MemoryCardDetailResponse> {
    return this.getCardByRingItemIdUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'SetupPin')
  setupPin(request: SetupPinRequest): Promise<SetupPinResponse> {
    return this.setupPinUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ChangePin')
  changePin(request: ChangePinRequest): Promise<ChangePinResponse> {
    return this.changePinUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ResetPin')
  resetPin(request: ResetPinRequest): Promise<ResetPinResponse> {
    return this.resetPinUseCase.execute(request);
  }
}
