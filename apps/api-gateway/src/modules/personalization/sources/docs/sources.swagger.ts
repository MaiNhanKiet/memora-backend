import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { PersonalizationSourceResponseDto } from '../dto/personalization-source.response.dto';

export function ApiListOrderSourcesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-011] List the personalization sources of an Order',
      description:
        'Requires Bearer auth and permission DESIGN_SUBMIT_OWN. Sources linked through the order consents or active bindings; DELETED sources are left out. Never returns object keys, checksums or metadata.',
    }),
    ApiBearerAuth(),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' }),
    ApiForbiddenResponse({
      description: 'Missing DESIGN_SUBMIT_OWN or not the order owner',
    }),
    ApiSuccessResponse({
      type: PersonalizationSourceResponseDto,
      isArray: true,
      description: 'Sources of the order owned by the caller',
    }),
    ApiNotFoundResponse({ description: 'ORDER_NOT_FOUND' }),
    ApiServiceUnavailableResponse({
      description: 'Operations or Commerce is unavailable',
    }),
  );
}
