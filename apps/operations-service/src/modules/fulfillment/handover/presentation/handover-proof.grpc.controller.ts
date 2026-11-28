import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  FULFILLMENT_SERVICE_NAME,
  type FulfillmentServiceHandler,
  type GetFullOrderHandoverForRingItemRequest,
  type GetFullOrderHandoverForRingItemResponse,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { GetFullOrderHandoverUseCase } from '../application/get-full-order-handover.use-case';

@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class HandoverProofGrpcController implements FulfillmentServiceHandler {
  constructor(
    private readonly getFullOrderHandoverUseCase: GetFullOrderHandoverUseCase,
  ) {}

  @GrpcMethod(FULFILLMENT_SERVICE_NAME, 'GetFullOrderHandoverForRingItem')
  getFullOrderHandoverForRingItem(
    request: GetFullOrderHandoverForRingItemRequest,
  ): Promise<GetFullOrderHandoverForRingItemResponse> {
    return this.getFullOrderHandoverUseCase.execute(request);
  }
}
