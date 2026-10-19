import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { LinkGoogleAccountRequestDto } from '../dto/request/link-google-account.request.dto';
import { AcceptedResponseDto } from '../dto/response/accepted.response.dto';
import { AuthSessionResponseDto } from '../dto/response/auth-session.response.dto';
import { GoogleLinkResponseDto } from '../dto/response/google-link.response.dto';
import { PublicUserResponseDto } from '../dto/response/public-user.response.dto';
import { RegisterChallengeResponseDto } from '../dto/response/register-challenge.response.dto';
import { ResendVerificationResponseDto } from '../dto/response/resend-verification.response.dto';
import { CSRF_HEADER_NAME } from '../cookies/auth-cookie.service';

export function ApiRegisterChallengeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: 'Start local registration and email a 6-digit code',
    }),
    ApiSuccessResponse({
      type: RegisterChallengeResponseDto,
      status: 202,
      description: 'Verification code sent',
    }),
  );
}

export function ApiAuthSessionDocs(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiSuccessResponse({ type: AuthSessionResponseDto }),
  );
}

export function ApiCookieCsrfDocs(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiHeader({
      name: CSRF_HEADER_NAME,
      required: true,
      description: 'Must match the non-HttpOnly CSRF cookie',
    }),
  );
}

export function ApiMeDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({ summary: 'Get the authenticated user' }),
    ApiSuccessResponse({ type: PublicUserResponseDto }),
  );
}

export function ApiAcceptedDocs(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiSuccessResponse({ type: AcceptedResponseDto }),
  );
}

export function ApiResendVerificationDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Resend the registration verification code' }),
    ApiSuccessResponse({ type: ResendVerificationResponseDto }),
  );
}

export function ApiLogoutDocs(summary: string) {
  return applyDecorators(ApiOperation({ summary }));
}

export function ApiLinkGoogleDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiExtraModels(GoogleLinkResponseDto, PublicUserResponseDto),
    ApiOperation({
      summary: 'Link Google to the authenticated MEMORA account',
      description: [
        'Send exactly one field.',
        '',
        '**1. Start linking.** Body is `{ "password": "..." }`.',
        'The API checks the current MEMORA password and returns `data.authorizationUrl`.',
        'Open that URL in the browser. The Google callback links the account when the emails match.',
        'When the Google email differs, the browser is redirected to `FRONTEND_AUTH_FAILURE_URL` with `error=google_email_confirmation_required` and `confirmationId`.',
        '',
        '**2. Confirm a different Google email.** Body is `{ "confirmationId": "..." }`.',
        'Use the `confirmationId` from that redirect. The API returns `data.user` with `authProvider` `HYBRID`.',
        'The id is one-time and expires after 5 minutes.',
      ].join('\n'),
    }),
    ApiBody({
      type: LinkGoogleAccountRequestDto,
      examples: {
        password: {
          summary: '1. Start with password',
          description: 'Returns data.authorizationUrl. Open it in the browser.',
          value: { password: 'CurrentPassword1!' },
        },
        confirmation: {
          summary: '2. Confirm a different Google email',
          description:
            'Send only the confirmationId from the redirect. Returns data.user.',
          value: {
            confirmationId: 'paste-confirmation-id-from-redirect',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description:
        'Password request returns authorizationUrl. Confirmation request returns the linked user.',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['statusCode', 'message', 'data'],
            properties: {
              statusCode: { type: 'number', example: 200 },
              message: { type: 'string', example: 'Google link accepted' },
              data: { $ref: getSchemaPath(GoogleLinkResponseDto) },
            },
          },
          examples: {
            started: {
              summary: '1. Started with password',
              value: {
                statusCode: 200,
                message: 'Google link accepted',
                data: {
                  authorizationUrl:
                    'https://accounts.google.com/o/oauth2/v2/auth?state=example',
                },
              },
            },
            confirmed: {
              summary: '2. Confirmed a different Google email',
              value: {
                statusCode: 200,
                message: 'Google link accepted',
                data: {
                  user: {
                    id: '11111111-1111-4111-8111-111111111111',
                    email: 'member@example.com',
                    fullName: 'Member',
                    authProvider: 'HYBRID',
                    status: 'ACTIVE',
                    createdAt: '2026-10-19T02:00:00.000Z',
                    updatedAt: '2026-10-19T02:05:00.000Z',
                  },
                },
              },
            },
          },
        },
      },
    }),
  );
}

export function ApiUnlinkGoogleDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'Unlink Google from the authenticated MEMORA user',
    }),
    ApiSuccessResponse({ type: PublicUserResponseDto }),
  );
}

export function ApiChangePasswordDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({ summary: 'Change the password of the authenticated user' }),
  );
}
