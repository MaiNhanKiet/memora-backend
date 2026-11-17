import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
  type CaptureAttemptImage,
  type CaptureSession,
  type CloseCaptureSessionRequest,
  type CompleteCaptureSessionRequest,
  type CreateCaptureSessionRequest,
  type FingerprintCaptureServiceHandler,
  type GetCaptureAttemptImageRequest,
  type GetCaptureSessionRequest,
  type NextCaptureAttemptRequest,
  type RejectCaptureAttemptRequest,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../../grpc/operations-internal-grpc-auth.guard';
import { CloseCaptureSessionUseCase } from '../../application/close-capture-session.use-case';
import { NextCaptureAttemptUseCase } from '../../application/next-capture-attempt.use-case';
import { RejectCaptureAttemptUseCase } from '../../application/reject-capture-attempt.use-case';
import { CompleteCaptureSessionUseCase } from '../../application/complete-capture-session.use-case';
import { CreateCaptureSessionUseCase } from '../../application/create-capture-session.use-case';
import { GetCaptureAttemptImageUseCase } from '../../application/get-capture-attempt-image.use-case';
import { GetCaptureSessionUseCase } from '../../application/get-capture-session.use-case';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class CaptureGrpcController implements FingerprintCaptureServiceHandler {
  constructor(
    private readonly createUseCase: CreateCaptureSessionUseCase,
    private readonly getUseCase: GetCaptureSessionUseCase,
    private readonly completeUseCase: CompleteCaptureSessionUseCase,
    private readonly imageUseCase: GetCaptureAttemptImageUseCase,
    private readonly rejectUseCase: RejectCaptureAttemptUseCase,
    private readonly nextUseCase: NextCaptureAttemptUseCase,
    private readonly closeUseCase: CloseCaptureSessionUseCase,
  ) {}

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'CreateCaptureSession',
  )
  createCaptureSession(
    request: CreateCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.createUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'GetCaptureSession',
  )
  getCaptureSession(
    request: GetCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.getUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'CompleteCaptureSession',
  )
  completeCaptureSession(
    request: CompleteCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.completeUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'GetCaptureAttemptImage',
  )
  getCaptureAttemptImage(
    request: GetCaptureAttemptImageRequest,
  ): Promise<CaptureAttemptImage> {
    return this.imageUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'RejectCaptureAttempt',
  )
  rejectCaptureAttempt(
    request: RejectCaptureAttemptRequest,
  ): Promise<CaptureSession> {
    return this.rejectUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'NextCaptureAttempt',
  )
  nextCaptureAttempt(
    request: NextCaptureAttemptRequest,
  ): Promise<CaptureSession> {
    return this.nextUseCase.execute(request);
  }

  @GrpcMethod(
    PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
    'CloseCaptureSession',
  )
  closeCaptureSession(
    request: CloseCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.closeUseCase.execute(request);
  }
}
