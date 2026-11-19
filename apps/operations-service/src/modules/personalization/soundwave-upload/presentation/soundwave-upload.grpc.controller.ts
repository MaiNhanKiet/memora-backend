import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME,
  type CompleteSoundwaveUploadRequest,
  type CompleteSoundwaveUploadResponse,
  type InitiateSoundwaveUploadRequest,
  type InitiateSoundwaveUploadResponse,
  type SoundwaveUploadServiceHandler,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { CompleteSoundwaveUploadUseCase } from '../application/complete-soundwave-upload.use-case';
import { InitiateSoundwaveUploadUseCase } from '../application/initiate-soundwave-upload.use-case';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class SoundwaveUploadGrpcController implements SoundwaveUploadServiceHandler {
  constructor(
    private readonly initiateUseCase: InitiateSoundwaveUploadUseCase,
    private readonly completeUseCase: CompleteSoundwaveUploadUseCase,
  ) {}

  @GrpcMethod(
    PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME,
    'InitiateSoundwaveUpload',
  )
  initiateSoundwaveUpload(
    request: InitiateSoundwaveUploadRequest,
  ): Promise<InitiateSoundwaveUploadResponse> {
    return this.initiateUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME,
    'CompleteSoundwaveUpload',
  )
  completeSoundwaveUpload(
    request: CompleteSoundwaveUploadRequest,
  ): Promise<CompleteSoundwaveUploadResponse> {
    return this.completeUseCase.execute(request);
  }
}
