import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  MEMORY_SERVICE_NAME,
  type InitiateMediaUploadRequest,
  type InitiateMediaUploadResponse,
  type ListCardContentsRequest,
  type ListCardContentsResponse,
  type UpdateCardContentsRequest,
  type UpdateCardContentsResponse,
} from '@app/contracts';
import { ExperienceInternalGrpcAuthGuard } from '../../../../grpc/experience-internal-grpc-auth.guard';
import {
  InitiateMediaUploadUseCase,
  ListCardContentsUseCase,
  UpdateCardContentsUseCase,
} from '../application/memory-content.use-cases';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryContentGrpcController {
  constructor(
    private readonly listCardContentsUseCase: ListCardContentsUseCase,
    private readonly updateCardContentsUseCase: UpdateCardContentsUseCase,
    private readonly initiateMediaUploadUseCase: InitiateMediaUploadUseCase,
  ) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListCardContents')
  listCardContents(
    request: ListCardContentsRequest,
  ): Promise<ListCardContentsResponse> {
    return this.listCardContentsUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'UpdateCardContents')
  updateCardContents(
    request: UpdateCardContentsRequest,
  ): Promise<UpdateCardContentsResponse> {
    return this.updateCardContentsUseCase.execute(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'InitiateMediaUpload')
  initiateMediaUpload(
    request: InitiateMediaUploadRequest,
  ): Promise<InitiateMediaUploadResponse> {
    return this.initiateMediaUploadUseCase.execute(request);
  }
}
