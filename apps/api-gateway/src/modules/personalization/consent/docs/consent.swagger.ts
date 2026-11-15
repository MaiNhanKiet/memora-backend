import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  ConsentListResponseDto,
  ConsentResponseDto,
} from '../dto/consent.response.dto';

function commonErrors() {
  return [
    ApiBearerAuth(),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' }),
    ApiForbiddenResponse({
      description: 'Missing CONSENT_MANAGE_OWN or not the order owner',
    }),
    ApiServiceUnavailableResponse({
      description: 'Operations or Commerce is unavailable',
    }),
  ];
}

export function ApiAcceptConsentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-001] Accept consent for 1-2 Ring Items of an Order',
      description:
        'Requires Bearer auth and permission CONSENT_MANAGE_OWN. Idempotent for the same type and item set.',
    }),
    ...commonErrors(),
    ApiSuccessResponse({
      type: ConsentResponseDto,
      status: 201,
      description: 'Consent accepted',
    }),
    ApiNotFoundResponse({ description: 'Order not found' }),
    ApiConflictResponse({
      description:
        'Message carries the reason: P1_NOT_PAID, POLICY_VERSION_MISMATCH, RING_ITEM_NOT_IN_ORDER, PACKAGE_MISMATCH, SHARED_SCOPE_NOT_ALLOWED, ITEM_ALREADY_CONSENTED',
    }),
  );
}

export function ApiListConsentsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-002] List the caller consents of an Order',
      description:
        'Requires Bearer auth and permission CONSENT_MANAGE_OWN. Newest first, all statuses.',
    }),
    ...commonErrors(),
    ApiSuccessResponse({
      type: ConsentListResponseDto,
      description: 'Consents of the order owned by the caller',
    }),
    ApiNotFoundResponse({ description: 'Not found' }),
    ApiConflictResponse({ description: 'Conflict' }),
  );
}

export function ApiRevokeConsentDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-003] Revoke a consent',
      description:
        'Requires Bearer auth and permission CONSENT_MANAGE_OWN. Idempotent when already revoked.',
    }),
    ...commonErrors(),
    ApiSuccessResponse({
      type: ConsentResponseDto,
      description: 'Consent revoked',
    }),
    ApiNotFoundResponse({
      description: 'Consent not found, other order, or not the owner',
    }),
    ApiConflictResponse({
      description: 'Message carries the reason: CONSENT_LOCKED',
    }),
  );
}
