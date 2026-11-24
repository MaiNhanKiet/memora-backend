import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import {
  FingerprintArtworkResponseDto,
  FingerprintFramesResponseDto,
} from '../dto/fingerprint-artwork.dto';

const PREVIEWS =
  'Preview URLs are presigned, valid for 300 s and sent with Cache-Control: no-store; never log or cache them. No object keys, checksums or erase strokes are returned.';

function common(conflict: string, unavailable: string) {
  return [
    ApiBearerAuth(),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' }),
    ApiForbiddenResponse({ description: 'Missing DESIGN_SUBMIT_OWN' }),
    ApiNotFoundResponse({
      description:
        'SOURCE_NOT_FOUND (missing, deleted or not yours), or VERSION_NOT_FOUND',
    }),
    ApiConflictResponse({ description: conflict }),
    ApiServiceUnavailableResponse({ description: unavailable }),
    ApiSuccessResponse({
      type: FingerprintArtworkResponseDto,
      description: 'Fingerprint artwork state',
    }),
  ];
}

export function ApiListFingerprintFramesDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-036] List the fingerprint frames (public)',
      description:
        'No authentication. The frames (NATURAL, CIRCLE, HEART, SQUARE) come from the processing worker and are cached by Operations for 10 minutes. Send the chosen code as shape in PERSO-038.',
    }),
    ApiSuccessResponse({
      type: FingerprintFramesResponseDto,
      description: 'Available frames',
    }),
    ApiServiceUnavailableResponse({
      description:
        'The processing worker is unavailable and no cached list exists (PROCESSING_WORKER_UNAVAILABLE)',
    }),
  );
}

export function ApiGetFingerprintArtworkDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-037] Read the fingerprint artwork versions of a source',
      description: `Requires Bearer auth and permission DESIGN_SUBMIT_OWN. Works for every non-deleted FINGERPRINT source of the caller, so the customer can resume: status, failureCode, baseImageUrl, currentVersionId, acceptedVersionId and every version with its frame, offset, zoom, erasedRatio, minEngraveSizeMm and previews (only while READY). Read only: the worker is not called. ${PREVIEWS}`,
    }),
    ...common(
      'SOURCE_NOT_READY: the source is not a FINGERPRINT',
      'Operations or object storage is unavailable',
    ),
  );
}

export function ApiCreateFingerprintCropDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-038] Create a new fingerprint design version (crop)',
      description: `Requires Bearer auth and permission DESIGN_SUBMIT_OWN. Frames the stored base image (frame, drag, zoom, optional eraser strokes), generates a new version and makes it current; earlier versions are kept. Allowed for a READY FINGERPRINT source whose artwork is not accepted, at most 10 versions. This can take several seconds. ${PREVIEWS}`,
    }),
    ...common(
      'SOURCE_NOT_READY, ARTWORK_LOCKED (a version was accepted), ARTWORK_NOT_EDITABLE (older worker, no base image) or ARTWORK_VERSION_LIMIT_REACHED',
      'PROCESSING_WORKER_UNAVAILABLE when the worker is down; Operations or object storage unavailable',
    ),
    ApiResponse({
      status: 422,
      description:
        'The worker refused the crop: ERASE_AREA_TOO_LARGE (over 15 % of the ridges erased) or FRAME_COVERAGE_TOO_LOW (under 70 % of the frame covered)',
    }),
  );
}

export function ApiAcceptFingerprintArtworkDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-039] Accept one fingerprint design version',
      description: `Requires Bearer auth and permission DESIGN_SUBMIT_OWN. Accepts the chosen version, locks the artwork and deletes the other versions and the base image. Idempotent. If deleting fails after the acceptance was saved, the call still answers 200 and the cleanup is retried the next time accept is called with the same version. Accepting does not replace the customer design approval (PERSO-018). ${PREVIEWS}`,
    }),
    ...common(
      'SOURCE_NOT_READY, ARTWORK_NOT_EDITABLE, or ARTWORK_LOCKED when a different version was already accepted',
      'Operations or object storage is unavailable',
    ),
  );
}
