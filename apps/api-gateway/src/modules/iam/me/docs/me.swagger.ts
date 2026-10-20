import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { PublicUserResponseDto } from '../../auth/dto/response/public-user.response.dto';
import { UpdateMyProfileRequestDto } from '../dto/request/update-my-profile.request.dto';
import { MyPermissionsResponseDto } from '../dto/response/my-permissions.response.dto';

export function ApiGetMeDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'Get the authenticated user',
      description:
        'Canonical current-user route. GET /api/v1/auth/me is removed.',
    }),
    ApiSuccessResponse({ type: PublicUserResponseDto }),
    ApiResponse({
      status: 401,
      description: 'Missing or invalid access token',
    }),
  );
}

const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});

export function ApiPatchMeDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiBody({ type: UpdateMyProfileRequestDto }),
    ApiOperation({
      summary: 'Update the authenticated user profile',
      description:
        'Accepts fullName and phone only. Omit a field to leave it unchanged. phone null clears the number.',
    }),
    ApiSuccessResponse({ type: PublicUserResponseDto }),
    unauthorized,
    ApiResponse({ status: 400, description: 'Invalid or empty profile patch' }),
    ApiResponse({ status: 404, description: 'User not found' }),
  );
}

export function ApiGetMyPermissionsDocs() {
  return applyDecorators(
    ApiBearerAuth('bearer'),
    ApiOperation({
      summary: 'Get the authenticated user effective roles and permissions',
      description:
        'Advisory for UI navigation. Backend guards remain the enforcement point.',
    }),
    ApiSuccessResponse({ type: MyPermissionsResponseDto }),
    unauthorized,
  );
}
