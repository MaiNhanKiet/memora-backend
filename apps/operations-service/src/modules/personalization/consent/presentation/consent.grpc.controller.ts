import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  PERSONALIZATION_CONSENT_SERVICE_NAME,
  type AcceptConsentRequest,
  type Consent,
  type ConsentServiceHandler,
  type ListConsentsRequest,
  type ListConsentsResponse,
  type RevokeConsentRequest,
} from '@app/contracts';
import { OperationsInternalGrpcAuthGuard } from '../../../../grpc/operations-internal-grpc-auth.guard';
import { AcceptConsentUseCase } from '../application/accept-consent.use-case';
import { ListConsentsUseCase } from '../application/list-consents.use-case';
import { RevokeConsentUseCase } from '../application/revoke-consent.use-case';

/** Thin gRPC adapter. Actor parsing and resource authorization live in the use cases. */
@Controller()
@UseGuards(OperationsInternalGrpcAuthGuard)
export class ConsentGrpcController implements ConsentServiceHandler {
  constructor(
    private readonly acceptConsentUseCase: AcceptConsentUseCase,
    private readonly listConsentsUseCase: ListConsentsUseCase,
    private readonly revokeConsentUseCase: RevokeConsentUseCase,
  ) {}

  @GrpcMethod(PERSONALIZATION_CONSENT_SERVICE_NAME, 'AcceptConsent')
  acceptConsent(request: AcceptConsentRequest): Promise<Consent> {
    return this.acceptConsentUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_CONSENT_SERVICE_NAME, 'ListConsents')
  listConsents(request: ListConsentsRequest): Promise<ListConsentsResponse> {
    return this.listConsentsUseCase.execute(request);
  }

  @GrpcMethod(PERSONALIZATION_CONSENT_SERVICE_NAME, 'RevokeConsent')
  revokeConsent(request: RevokeConsentRequest): Promise<Consent> {
    return this.revokeConsentUseCase.execute(request);
  }
}
