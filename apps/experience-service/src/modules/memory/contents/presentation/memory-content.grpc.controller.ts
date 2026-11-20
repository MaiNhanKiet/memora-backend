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
import { MemoryContentService } from '../application/memory-content.service';

@Controller()
@UseGuards(ExperienceInternalGrpcAuthGuard)
export class MemoryContentGrpcController {
  constructor(private readonly contentService: MemoryContentService) {}

  @GrpcMethod(MEMORY_SERVICE_NAME, 'ListCardContents')
  listCardContents(
    request: ListCardContentsRequest,
  ): Promise<ListCardContentsResponse> {
    return this.contentService.listCardContents(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'UpdateCardContents')
  updateCardContents(
    request: UpdateCardContentsRequest,
  ): Promise<UpdateCardContentsResponse> {
    return this.contentService.updateCardContents(request);
  }

  @GrpcMethod(MEMORY_SERVICE_NAME, 'InitiateMediaUpload')
  initiateMediaUpload(
    request: InitiateMediaUploadRequest,
  ): Promise<InitiateMediaUploadResponse> {
    return this.contentService.initiateMediaUpload(request);
  }
}
