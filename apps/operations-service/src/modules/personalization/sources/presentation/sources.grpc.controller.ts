import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_SOURCE_SERVICE_NAME,
  type AcceptWavecodeStyleRequest,
  type GetSoundwaveWavecodeRequest,
  type ResegmentSoundwaveSourceRequest,
  type SelectWavecodeStyleRequest,
  type SoundwaveWavecode,
  type GetSourceProcessingRequest,
  type ListOrderSourcesRequest,
  type ListOrderSourcesResponse,
  type PersonalizationSourceServiceHandler,
  type SourceProcessing,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { GetSourceProcessingUseCase } from '../application/get-source-processing.use-case';
import { ListOrderSourcesUseCase } from '../application/list-order-sources.use-case';
import { ResegmentSoundwaveSourceUseCase } from '../application/resegment-soundwave-source.use-case';
import {
  AcceptWavecodeStyleUseCase,
  GetSoundwaveWavecodeUseCase,
  SelectWavecodeStyleUseCase,
} from '../application/wavecode-style.use-cases';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use case. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class SourcesGrpcController implements PersonalizationSourceServiceHandler {
  constructor(
    private readonly listOrderSourcesUseCase: ListOrderSourcesUseCase,
    private readonly getSourceProcessingUseCase: GetSourceProcessingUseCase,
    private readonly getWavecodeUseCase: GetSoundwaveWavecodeUseCase,
    private readonly selectStyleUseCase: SelectWavecodeStyleUseCase,
    private readonly acceptStyleUseCase: AcceptWavecodeStyleUseCase,
    private readonly resegmentUseCase: ResegmentSoundwaveSourceUseCase,
  ) {}

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'ListOrderSources')
  listOrderSources(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse> {
    return this.listOrderSourcesUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'GetSourceProcessing')
  getSourceProcessing(
    request: GetSourceProcessingRequest,
  ): Promise<SourceProcessing> {
    return this.getSourceProcessingUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'GetSoundwaveWavecode')
  getSoundwaveWavecode(
    request: GetSoundwaveWavecodeRequest,
  ): Promise<SoundwaveWavecode> {
    return this.getWavecodeUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'SelectWavecodeStyle')
  selectWavecodeStyle(
    request: SelectWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode> {
    return this.selectStyleUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'AcceptWavecodeStyle')
  acceptWavecodeStyle(
    request: AcceptWavecodeStyleRequest,
  ): Promise<SoundwaveWavecode> {
    return this.acceptStyleUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'ResegmentSoundwaveSource')
  resegmentSoundwaveSource(
    request: ResegmentSoundwaveSourceRequest,
  ): Promise<SoundwaveWavecode> {
    return this.resegmentUseCase.execute(request);
  }
}
