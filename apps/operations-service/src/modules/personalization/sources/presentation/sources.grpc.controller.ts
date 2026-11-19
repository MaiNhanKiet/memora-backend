import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_SOURCE_SERVICE_NAME,
  type ListOrderSourcesRequest,
  type ListOrderSourcesResponse,
  type PersonalizationSourceServiceHandler,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { ListOrderSourcesUseCase } from '../application/list-order-sources.use-case';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use case. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class SourcesGrpcController implements PersonalizationSourceServiceHandler {
  constructor(
    private readonly listOrderSourcesUseCase: ListOrderSourcesUseCase,
  ) {}

  @GrpcMethod(PERSONALIZATION_SOURCE_SERVICE_NAME, 'ListOrderSources')
  listOrderSources(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse> {
    return this.listOrderSourcesUseCase.execute(request);
  }
}
