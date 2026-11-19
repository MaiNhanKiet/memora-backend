import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_SOURCE_SERVICE_NAME,
  type GetSourceProcessingRequest,
  type ListOrderSourcesRequest,
  type ListOrderSourcesResponse,
  type PersonalizationSourceServiceHandler,
  type SourceProcessing,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { GetSourceProcessingUseCase } from '../application/get-source-processing.use-case';
import { ListOrderSourcesUseCase } from '../application/list-order-sources.use-case';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use case. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class SourcesGrpcController implements PersonalizationSourceServiceHandler {
  constructor(
    private readonly listOrderSourcesUseCase: ListOrderSourcesUseCase,
    private readonly getSourceProcessingUseCase: GetSourceProcessingUseCase,
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
}
