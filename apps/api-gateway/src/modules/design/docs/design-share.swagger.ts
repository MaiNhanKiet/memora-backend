import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateDesignShareLinkResponseDto,
  RevokeDesignShareLinkResponseDto,
} from '../dto/design-share.dto';

export function ApiCreateDesignShareLink() {
  return applyDecorators(
    ApiTags('Design Drafts'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 201,
      description: 'Share link created successfully',
      type: CreateDesignShareLinkResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Caller does not own this design draft',
    }),
    ApiResponse({
      status: 404,
      description: 'Design draft not found',
    }),
  );
}

export function ApiRevokeDesignShareLink() {
  return applyDecorators(
    ApiTags('Design Drafts'),
    ApiBearerAuth(),
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
    ApiResponse({
      status: 200,
      description: 'Share link revoked successfully',
      type: RevokeDesignShareLinkResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Caller does not own this design draft',
    }),
    ApiResponse({
      status: 404,
      description: 'Draft or share link not found',
    }),
  );
}
