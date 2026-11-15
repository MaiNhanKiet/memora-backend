import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '@app/auth';
import type { AuthenticatedPrincipal } from '@app/auth';
import { PERMISSIONS } from '@app/contracts';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { toVerifiedActor } from '../../../../common/grpc/verified-actor';
import { PersonalizationGrpcClient } from '../../clients/personalization-grpc.client';
import {
  ApiAcceptConsentDocs,
  ApiListConsentsDocs,
  ApiRevokeConsentDocs,
} from '../docs/consent.swagger';
import { AcceptConsentRequestDto } from '../dto/accept-consent.request.dto';
import type {
  ConsentListResponseDto,
  ConsentResponseDto,
} from '../dto/consent.response.dto';
import {
  toConsentListResponse,
  toConsentResponse,
} from '../mappers/consent-http.mapper';

@ApiTags('consents')
@Controller('orders/:orderId/consents')
@RequirePermissions(PERMISSIONS.CONSENT_MANAGE_OWN)
export class ConsentController {
  constructor(
    private readonly personalizationClient: PersonalizationGrpcClient,
  ) {}

  // [PERSO-001] POST /api/v1/orders/:orderId/consents
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiAcceptConsentDocs()
  async acceptConsent(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: AcceptConsentRequestDto,
  ): Promise<ConsentResponseDto> {
    const consent = await this.personalizationClient.acceptConsent({
      actor: toVerifiedActor(principal),
      orderId,
      consentType: body.consentType,
      policyVersion: body.policyVersion,
      ringItemIds: body.ringItemIds,
    });
    return toConsentResponse(consent);
  }

  // [PERSO-002] GET /api/v1/orders/:orderId/consents
  @Get()
  @ApiListConsentsDocs()
  async listConsents(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<ConsentListResponseDto> {
    const response = await this.personalizationClient.listConsents({
      actor: toVerifiedActor(principal),
      orderId,
    });
    return toConsentListResponse(response);
  }

  // [PERSO-003] POST /api/v1/orders/:orderId/consents/:consentId/revoke
  @Post(':consentId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiRevokeConsentDocs()
  async revokeConsent(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('consentId', ParseUUIDPipe) consentId: string,
  ): Promise<ConsentResponseDto> {
    const consent = await this.personalizationClient.revokeConsent({
      actor: toVerifiedActor(principal),
      orderId,
      consentId,
    });
    return toConsentResponse(consent);
  }
}
