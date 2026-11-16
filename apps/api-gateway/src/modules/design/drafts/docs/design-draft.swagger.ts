import { applyDecorators } from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  DuplicateDesignDraftResponseDto,
  GetDesignDraftResponseDto,
} from '../dto';

const GUEST_HEADER_DOC = ApiHeader({
  name: 'x-guest-session-id',
  required: false,
  description: 'Guest session UUID when not authenticated with Bearer JWT',
});

export function ApiGetDesignDraftDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-007] Get design draft details',
      description:
        'Retrieves full configuration and estimated price of an owned ring design draft.',
    }),
    GUEST_HEADER_DOC,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the target design draft',
      example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    }),
    ApiSuccessResponse({
      type: GetDesignDraftResponseDto,
      status: 200,
      description: 'Design draft details retrieved successfully',
    }),
    ApiResponse({ status: 400, description: 'Missing actor identity' }),
    ApiResponse({
      status: 403,
      description: 'Forbidden: not owner of this draft',
    }),
    ApiResponse({ status: 404, description: 'Draft not found' }),
  );
}

export function ApiDuplicateDesignDraftDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[DESIG-008] Duplicate design draft into active cart',
      description:
        'Duplicates an existing design draft into the actor active cart and recalculates real-time price.',
    }),
    GUEST_HEADER_DOC,
    ApiParam({
      name: 'draftId',
      description: 'UUID of the design draft to duplicate',
      example: 'd1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c',
    }),
    ApiSuccessResponse({
      type: DuplicateDesignDraftResponseDto,
      status: 201,
      description: 'Draft duplicated successfully into cart',
    }),
    ApiResponse({ status: 400, description: 'Missing actor identity' }),
    ApiResponse({ status: 404, description: 'Source draft not found' }),
  );
}
