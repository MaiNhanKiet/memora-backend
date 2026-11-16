import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../common/docs/api-success-response';
import {
  CreateDesignShareLinkResponseDto,
  RevokeDesignShareLinkResponseDto,
} from '../dto/design-share.dto';

const bearer = ApiBearerAuth('bearer');
const unauthorized = ApiResponse({
  status: 401,
  description: 'Missing or invalid access token',
});
const forbidden = ApiResponse({
  status: 403,
  description: 'Caller does not own this design draft',
});
const notFound = (res: string) =>
  ApiResponse({
    status: 404,
    description: `${res} not found`,
  });

export function ApiCreateDesignShareLink() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[DESIG-009] Create share link for a 3D ring design draft',
      description:
        'Generates a unique share code and URL for the specified ring design draft, allowing friends/partner to view the design in 3D.',
    }),
    ApiParam({
      name: 'draftId',
      description: 'Design draft UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: CreateDesignShareLinkResponseDto,
      status: 201,
      description: 'Share link created successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid expiresInDays parameter' }),
    unauthorized,
    forbidden,
    notFound('Design draft'),
  );
}

export function ApiRevokeDesignShareLink() {
  return applyDecorators(
    bearer,
    ApiOperation({
      summary: '[DESIG-010] Revoke an active share link for a design draft',
      description:
        'Revokes an existing design share link, immediately invalidating public access to the shared link.',
    }),
    ApiParam({
      name: 'draftId',
      description: 'Design draft UUID',
      type: String,
    }),
    ApiParam({
      name: 'linkId',
      description: 'Share link UUID',
      type: String,
    }),
    ApiSuccessResponse({
      type: RevokeDesignShareLinkResponseDto,
      status: 200,
      description: 'Share link revoked successfully',
    }),
    unauthorized,
    forbidden,
    notFound('Draft or share link'),
  );
}
