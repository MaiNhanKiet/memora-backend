import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, SuccessMessage } from '@app/common';
import type { Request } from 'express';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthRateLimit } from '../../auth/decorators/auth-rate-limit.decorator';
import type { GatewayAuthenticatedPrincipal } from '../../auth/gateway-principal';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import { ConfirmGuestVerificationRequestDto } from '../dto/request/confirm-guest-verification.request.dto';
import { LinkGuestIdentityRequestDto } from '../dto/request/link-guest-identity.request.dto';
import { RequestGuestVerificationRequestDto } from '../dto/request/request-guest-verification.request.dto';
import type {
  CustomerIdentityProjectionDto,
  GuestVerificationChallengeResponseDto,
  GuestVerificationProofResponseDto,
  LinkedGuestIdentityResponseDto,
  MyCustomerIdentityResponseDto,
} from '../dto/response/guest-verification.response.dto';
import {
  ApiConfirmGuestVerificationDocs,
  ApiGetMyCustomerIdentityDocs,
  ApiLinkGuestIdentityDocs,
  ApiRequestGuestVerificationDocs,
} from '../docs/guest-identity.swagger';

@ApiTags('Guest identity')
@Controller('identities')
export class GuestIdentityController {
  constructor(private readonly iam: IamGrpcClient) {}

  @Post('guest/verify/request')
  @Public()
  @AuthRateLimit(5, 15)
  @HttpCode(202)
  @SuccessMessage('Verification code sent')
  @ApiRequestGuestVerificationDocs()
  requestVerification(
    @Body() body: RequestGuestVerificationRequestDto,
    @Req() request: Request,
  ): Promise<GuestVerificationChallengeResponseDto> {
    return this.iam.requestGuestIdentityVerification(
      body.contactEmail,
      request.ip ?? '',
    );
  }

  @Post('guest/verify/confirm')
  @Public()
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @ApiConfirmGuestVerificationDocs()
  confirmVerification(
    @Body() body: ConfirmGuestVerificationRequestDto,
  ): Promise<GuestVerificationProofResponseDto> {
    return this.iam.confirmGuestIdentityVerification(
      body.challengeId,
      body.otp,
    );
  }

  @Get('me')
  @ApiGetMyCustomerIdentityDocs()
  async getMyIdentity(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
  ): Promise<MyCustomerIdentityResponseDto> {
    const result = await this.iam.getMyCustomerIdentity(
      requireCredential(principal),
    );
    return {
      primary:
        result.primary === undefined ? null : toProjection(result.primary),
    };
  }

  @Post('link-account')
  @HttpCode(200)
  @ApiLinkGuestIdentityDocs()
  linkAccount(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Body() body: LinkGuestIdentityRequestDto,
  ): Promise<LinkedGuestIdentityResponseDto> {
    return this.iam.linkGuestIdentityToMyAccount(
      requireCredential(principal),
      body.guestProof,
    );
  }
}

function requireCredential(
  principal: GatewayAuthenticatedPrincipal | undefined,
): string {
  if (principal === undefined) {
    throw new UnauthorizedException();
  }
  return principal.accessCredential;
}

function toProjection(
  identity: CustomerIdentityProjectionDto,
): CustomerIdentityProjectionDto {
  return {
    id: identity.id,
    contactEmail: identity.contactEmail,
    isPrimaryForUser: identity.isPrimaryForUser,
    ...(identity.displayName === undefined
      ? {}
      : { displayName: identity.displayName }),
    ...(identity.emailVerifiedAt === undefined
      ? {}
      : { emailVerifiedAt: identity.emailVerifiedAt }),
    ...(identity.accountLinkedAt === undefined
      ? {}
      : { accountLinkedAt: identity.accountLinkedAt }),
  };
}
