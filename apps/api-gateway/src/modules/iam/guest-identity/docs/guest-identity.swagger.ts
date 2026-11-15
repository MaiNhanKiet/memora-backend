import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { GuestSessionResponseDto } from '../dto/response/guest-verification.response.dto';
import { GuestVerificationChallengeResponseDto } from '../dto/response/guest-verification.response.dto';
import { GuestVerificationProofResponseDto } from '../dto/response/guest-verification.response.dto';
import { LinkedGuestIdentityResponseDto } from '../dto/response/guest-verification.response.dto';
import { MyCustomerIdentityResponseDto } from '../dto/response/guest-verification.response.dto';

const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});

export function ApiRequestGuestVerificationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request a guest email verification code',
      description:
        'Creates a challenge for a new guest identity. Does not reveal whether an email already exists and does not create a user.',
    }),
    ApiSuccessResponse({
      type: GuestVerificationChallengeResponseDto,
      status: 202,
      description: 'Verification code sent',
    }),
    ApiResponse({ status: 400, description: 'Invalid email' }),
    ApiResponse({ status: 429, description: 'Rate limit or resend cooldown' }),
    ApiResponse({
      status: 503,
      description: 'Email or session store unavailable',
    }),
  );
}

export function ApiCreateGuestSessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create an anonymous guest session',
      description:
        'Issues a server-side guest session token for Guest Cart. Send it as the X-Guest-Session header on routes that accept guests. No user or customer identity is created.',
    }),
    ApiSuccessResponse({
      type: GuestSessionResponseDto,
      status: 201,
      description: 'Guest session created',
    }),
    ApiResponse({ status: 429, description: 'Rate limit exceeded' }),
    ApiResponse({ status: 503, description: 'Session store unavailable' }),
  );
}

export function ApiConfirmGuestVerificationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirm a guest email verification code',
      description:
        'Creates one verified guest identity and returns a short-lived link-account proof and a 24-hour guest access token. Neither is a login token.',
    }),
    ApiSuccessResponse({ type: GuestVerificationProofResponseDto }),
    ApiResponse({
      status: 400,
      description: 'Invalid, expired, or already used challenge',
    }),
    ApiResponse({ status: 429, description: 'Too many attempts' }),
    ApiResponse({ status: 503, description: 'Identity store unavailable' }),
  );
}

export function ApiGetMyCustomerIdentityDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'Get the authenticated user primary customer identity',
    }),
    ApiSuccessResponse({ type: MyCustomerIdentityResponseDto }),
    unauthorized,
  );
}

export function ApiLinkGuestIdentityDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'Link a verified guest identity to the authenticated user',
    }),
    ApiSuccessResponse({ type: LinkedGuestIdentityResponseDto }),
    unauthorized,
    ApiResponse({ status: 400, description: 'Invalid or expired guest proof' }),
    ApiResponse({ status: 403, description: 'Guest identity is not verified' }),
    ApiResponse({ status: 404, description: 'Customer identity not found' }),
    ApiResponse({
      status: 409,
      description:
        'Identity already linked or user already has a primary identity',
    }),
  );
}
