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
  type AcceptConsentRequest,
  type Consent,
  type ListConsentsRequest,
  type ListConsentsResponse,
  type PersonalizationConsentServiceClient,
  type RevokeConsentRequest,
} from '@app/contracts';
import { DomainGrpcClient } from '../../../common/grpc/domain-grpc';

export const OPERATIONS_PERSONALIZATION_GRPC_CLIENT =
  'OPERATIONS_PERSONALIZATION_GRPC_CLIENT';

const FAILED_PRECONDITION_MESSAGE = 'Failed precondition';

/**
 * Gateway client for `memora.personalization.v1.ConsentService` (Operations).
 * The Operations target is optional: when it is not configured every call fails
 * with 503 instead of crashing Gateway startup.
 */
@Injectable()
export class PersonalizationGrpcClient
  extends DomainGrpcClient
  implements OnModuleInit
{
  private consentService!: PersonalizationConsentServiceClient;

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

  /**
   * Consent contract: FAILED_PRECONDITION and ALREADY_EXISTS are 409 (the shared
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
