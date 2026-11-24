import { BadRequestException, Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  CreateGuestSessionRequest,
  CreateGuestSessionResponse,
  RevokeGuestSessionRequest,
  RevokeGuestSessionResponse,
  ValidateGuestAccessTokenRequest,
  ValidateGuestAccessTokenResponse,
  ValidateGuestSessionRequest,
  ValidateGuestSessionResponse,
  ConfirmGuestIdentityVerificationRequest,
  ConfirmGuestIdentityVerificationResponse,
  CustomerIdentityProjectionMessage,
  GetMyCustomerIdentityRequest,
  GetMyCustomerIdentityResponse,
  LinkGuestIdentityToMyAccountRequest,
  LinkGuestIdentityToMyAccountResponse,
  RequestGuestIdentityVerificationRequest,
  RequestGuestIdentityVerificationResponse,
} from '@app/contracts';
import type { CustomerIdentity } from '../../../generated/prisma/client';
import { GuestAccessService } from '../../application/users/guest-access.service';
import { GuestIdentityService } from '../../application/users/guest-identity.service';
import { requireCredential, requireText } from './grpc-request';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';

@Controller()
@UseGuards(InternalGrpcAuthGuard)
export class GuestIdentityGrpcController {
  constructor(
    private readonly guests: GuestIdentityService,
    private readonly guestAccess: GuestAccessService,
  ) {}

  @GrpcMethod('IamService', 'RequestGuestIdentityVerification')
  requestGuestIdentityVerification(
    request: RequestGuestIdentityVerificationRequest,
  ): Promise<RequestGuestIdentityVerificationResponse> {
    return this.guests.requestVerification(
      requireText(request.contactEmail, 'contact_email', 320),
      clientIp(request.clientIp),
    );
  }

  @GrpcMethod('IamService', 'ConfirmGuestIdentityVerification')
  confirmGuestIdentityVerification(
    request: ConfirmGuestIdentityVerificationRequest,
  ): Promise<ConfirmGuestIdentityVerificationResponse> {
    return this.guests.confirmVerification(
      requireText(request.challengeId, 'challenge_id', 128),
      requireText(request.otp, 'otp', 16),
    );
  }

  @GrpcMethod('IamService', 'GetMyCustomerIdentity')
  async getMyCustomerIdentity(
    request: GetMyCustomerIdentityRequest,
  ): Promise<GetMyCustomerIdentityResponse> {
    const primary = await this.guests.getPrimary(
      requireCredential(request.accessCredential),
    );
    if (primary === null) {
      return {};
    }
    return { primary: toProjection(primary) };
  }

  @GrpcMethod('IamService', 'LinkGuestIdentityToMyAccount')
  linkGuestIdentityToMyAccount(
    request: LinkGuestIdentityToMyAccountRequest,
  ): Promise<LinkGuestIdentityToMyAccountResponse> {
    return this.guests.linkToMyAccount(
      requireCredential(request.accessCredential),
      requireText(request.guestProof, 'guest_proof', 256),
    );
  }

  @GrpcMethod('IamService', 'CreateGuestSession')
  createGuestSession(
    request: CreateGuestSessionRequest,
  ): Promise<CreateGuestSessionResponse> {
    return this.guestAccess.createSession(clientIp(request.clientIp));
  }

  @GrpcMethod('IamService', 'ValidateGuestSession')
  validateGuestSession(
    request: ValidateGuestSessionRequest,
  ): Promise<ValidateGuestSessionResponse> {
    return this.guestAccess.validateSession(request.guestSessionToken ?? '');
  }

  @GrpcMethod('IamService', 'ValidateGuestAccessToken')
  validateGuestAccessToken(
    request: ValidateGuestAccessTokenRequest,
  ): Promise<ValidateGuestAccessTokenResponse> {
    return this.guestAccess.validateAccessToken(request.guestAccessToken ?? '');
  }

  @GrpcMethod('IamService', 'RevokeGuestSession')
  revokeGuestSession(
    request: RevokeGuestSessionRequest,
  ): Promise<RevokeGuestSessionResponse> {
    return this.guestAccess.revokeSession(request.guestSessionToken ?? '');
  }
}

function clientIp(value: string | undefined): string {
  if (value === undefined) {
    return '';
  }
  if (value.length > 128) {
    throw new BadRequestException('client_ip is invalid');
  }
  return value.trim();
}

function toProjection(
  identity: CustomerIdentity,
): CustomerIdentityProjectionMessage {
  return {
    id: identity.id,
    ...(identity.displayName === null
      ? {}
      : { displayName: identity.displayName }),
    contactEmail: identity.contactEmail,
    ...(identity.emailVerifiedAt === null
      ? {}
      : { emailVerifiedAt: identity.emailVerifiedAt.toISOString() }),
    isPrimaryForUser: identity.isPrimaryForUser,
    ...(identity.accountLinkedAt === null
      ? {}
      : { accountLinkedAt: identity.accountLinkedAt.toISOString() }),
  };
}
