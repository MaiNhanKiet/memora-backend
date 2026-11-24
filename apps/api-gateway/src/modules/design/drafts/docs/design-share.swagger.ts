import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  CreateDesignShareLinkResponseDto,
  RevokeDesignShareLinkResponseDto,
} from '../dto';

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
    ApiOperation({
      summary: '[DESIG-009] Create public share link for design draft',
      description:
        'Generates an opaque public share token for a ring design draft. Available to both authenticated customers and guest sessions. Default expiration is 7 days (customizable 1-30 days). Idempotent within validity window.',
    }),
    bearer,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the design draft to share',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: CreateDesignShareLinkResponseDto,
      status: 201,
      description: 'Share link created successfully with public URL',
    }),
    ApiResponse({ status: 400, description: 'Invalid draft ID or options' }),
    unauthorized,
    forbidden,
    notFound('Design draft'),
  );
}

export function ApiRevokeDesignShareLink() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-010] Revoke public share link',
      description:
        'Explicitly revokes an active design share link before its expiration. Only the original creator/owner of the draft can revoke it.',
    }),
    bearer,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the design draft',
      type: 'string',
      format: 'uuid',
    }),
    ApiParam({
      name: 'linkId',
      description: 'UUID of the share link to revoke',
      type: 'string',
      format: 'uuid',
    }),
    ApiSuccessResponse({
      type: RevokeDesignShareLinkResponseDto,
      status: 200,
      description: 'Share link revoked successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid UUID format' }),
    unauthorized,
    forbidden,
    notFound('Share link'),
  );
}
