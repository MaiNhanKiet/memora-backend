import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { TimeoutError } from 'rxjs';
import {
  ERROR_CODES,
  isRecord,
  isSafePublicMessage,
  mapGrpcError,
  mapGrpcErrorToHttpException,
} from '@app/common';
import {
  PERSONALIZATION_CONSENT_SERVICE_NAME,
  PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
  PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME,
  PERSONALIZATION_SOURCE_SERVICE_NAME,
  type AcceptConsentRequest,
  type CompleteSoundwaveUploadRequest,
  type CompleteSoundwaveUploadResponse,
  type InitiateSoundwaveUploadRequest,
  type InitiateSoundwaveUploadResponse,
  type SoundwaveUploadServiceClient,
  type CaptureAttemptImage,
  type CaptureSession,
  type CloseCaptureSessionRequest,
  type CompleteCaptureSessionRequest,
  type Consent,
  type CreateCaptureSessionRequest,
  type GetCaptureAttemptImageRequest,
  type GetCaptureSessionRequest,
  type ListConsentsRequest,
  type ListOrderSourcesRequest,
  type ListOrderSourcesResponse,
  type ListConsentsResponse,
  type NextCaptureAttemptRequest,
  type PersonalizationConsentServiceClient,
  type PersonalizationFingerprintCaptureServiceClient,
  type PersonalizationSourceServiceClient,
  type RejectCaptureAttemptRequest,
  type RevokeConsentRequest,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const OPERATIONS_PERSONALIZATION_GRPC_CLIENT =
  'OPERATIONS_PERSONALIZATION_GRPC_CLIENT';

const FAILED_PRECONDITION_MESSAGE = 'Failed precondition';
/** PERSO-010: the uploaded object failed verification. Sent as INVALID_ARGUMENT, answered 422. */
const UPLOAD_INVALID_REASON = 'UPLOAD_INVALID';

/**
 * Gateway client for `memora.personalization.v1.ConsentService` and
 * `FingerprintCaptureService` (Operations).
 * The Operations target is optional: when it is not configured every call fails
 * with 503 instead of crashing Gateway startup.
 */
@Injectable()
export class PersonalizationGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private consentService!: PersonalizationConsentServiceClient;
  private captureService!: PersonalizationFingerprintCaptureServiceClient;
  private sourceService!: PersonalizationSourceServiceClient;
  private soundwaveUploadService!: SoundwaveUploadServiceClient;

  constructor(
    @Inject(OPERATIONS_PERSONALIZATION_GRPC_CLIENT)
    private readonly grpcClient: ClientGrpc,
    configService: ConfigService,
  ) {
    super(configService, 'apiGateway.operationsInternalGrpcSecret', {
      optional: true,
    });
  }

  onModuleInit(): void {
    this.consentService =
      this.grpcClient.getService<PersonalizationConsentServiceClient>(
        PERSONALIZATION_CONSENT_SERVICE_NAME,
      );
    this.captureService =
      this.grpcClient.getService<PersonalizationFingerprintCaptureServiceClient>(
        PERSONALIZATION_FINGERPRINT_CAPTURE_SERVICE_NAME,
      );
    this.sourceService =
      this.grpcClient.getService<PersonalizationSourceServiceClient>(
        PERSONALIZATION_SOURCE_SERVICE_NAME,
      );
    this.soundwaveUploadService =
      this.grpcClient.getService<SoundwaveUploadServiceClient>(
        PERSONALIZATION_SOUNDWAVE_UPLOAD_SERVICE_NAME,
      );
  }

  acceptConsent(request: AcceptConsentRequest): Promise<Consent> {
    return this.unary((metadata) =>
      this.consentService.acceptConsent(request, metadata),
    );
  }

  listConsents(request: ListConsentsRequest): Promise<ListConsentsResponse> {
    return this.unary((metadata) =>
      this.consentService.listConsents(request, metadata),
    );
  }

  revokeConsent(request: RevokeConsentRequest): Promise<Consent> {
    return this.unary((metadata) =>
      this.consentService.revokeConsent(request, metadata),
    );
  }

  createCaptureSession(
    request: CreateCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.createCaptureSession(request, metadata),
    );
  }

  getCaptureSession(
    request: GetCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.getCaptureSession(request, metadata),
    );
  }

  completeCaptureSession(
    request: CompleteCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.completeCaptureSession(request, metadata),
    );
  }

  getCaptureAttemptImage(
    request: GetCaptureAttemptImageRequest,
  ): Promise<CaptureAttemptImage> {
    return this.unary((metadata) =>
      this.captureService.getCaptureAttemptImage(request, metadata),
    );
  }

  rejectCaptureAttempt(
    request: RejectCaptureAttemptRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.rejectCaptureAttempt(request, metadata),
    );
  }

  nextCaptureAttempt(
    request: NextCaptureAttemptRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.nextCaptureAttempt(request, metadata),
    );
  }

  closeCaptureSession(
    request: CloseCaptureSessionRequest,
  ): Promise<CaptureSession> {
    return this.unary((metadata) =>
      this.captureService.closeCaptureSession(request, metadata),
    );
  }

  listOrderSources(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse> {
    return this.unary((metadata) =>
      this.sourceService.listOrderSources(request, metadata),
    );
  }

  initiateSoundwaveUpload(
    request: InitiateSoundwaveUploadRequest,
  ): Promise<InitiateSoundwaveUploadResponse> {
    return this.unary((metadata) =>
      this.soundwaveUploadService.initiateSoundwaveUpload(request, metadata),
    );
  }

  completeSoundwaveUpload(
    request: CompleteSoundwaveUploadRequest,
  ): Promise<CompleteSoundwaveUploadResponse> {
    return this.unary((metadata) =>
      this.soundwaveUploadService.completeSoundwaveUpload(request, metadata),
    );
  }

  /**
   * Consent and capture contract: FAILED_PRECONDITION and ALREADY_EXISTS are 409 (the shared
   * mapper turns FAILED_PRECONDITION into 412), deadline is 503. The Operations
   * reason code (for example P1_NOT_PAID) travels in the gRPC details and is
   * exposed as the error `message` only when it passes the shared safe-message
   * check; other details are never forwarded.
   */
  protected override mapError(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }
    if (error instanceof TimeoutError) {
      return unavailable();
    }
    const grpcStatus =
      isRecord(error) && typeof error.code === 'number'
        ? error.code
        : undefined;
    if (grpcStatus === GrpcStatus.DEADLINE_EXCEEDED) {
      return unavailable();
    }
    if (
      grpcStatus === GrpcStatus.INVALID_ARGUMENT &&
      readReason(error) === UPLOAD_INVALID_REASON
    ) {
      return unprocessable(UPLOAD_INVALID_REASON);
    }
    if (grpcStatus === GrpcStatus.FAILED_PRECONDITION) {
      return conflict(readReason(error));
    }
    return mapGrpcErrorToHttpException(error);
  }
}

function unavailable(): HttpException {
  const mapped = mapGrpcError({ code: GrpcStatus.UNAVAILABLE });
  return new HttpException(
    {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: mapped.code,
      message: mapped.message,
    },
    HttpStatus.SERVICE_UNAVAILABLE,
  );
}

function unprocessable(message: string): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ERROR_CODES.BAD_REQUEST,
      message,
    },
    HttpStatus.UNPROCESSABLE_ENTITY,
  );
}

function conflict(message: string): HttpException {
  return new HttpException(
    {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.CONFLICT,
      message,
    },
    HttpStatus.CONFLICT,
  );
}

function readReason(error: unknown): string {
  if (isRecord(error)) {
    const details = error.details;
    if (typeof details === 'string' && isSafePublicMessage(details)) {
      return details;
    }
  }
  return FAILED_PRECONDITION_MESSAGE;
}
