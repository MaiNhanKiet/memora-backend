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
  CompleteSoundwaveUploadResponseDto,
  InitiateSoundwaveUploadResponseDto,
} from '../dto/soundwave-upload.response.dto';

function commonErrors(badRequest: string, notFound: string, conflict: string) {
  return [
    ApiBearerAuth(),
    ApiBadRequestResponse({ description: badRequest }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' }),
    ApiForbiddenResponse({
      description: 'Missing SOURCE_AUDIO_UPLOAD_OWN or not the order owner',
    }),
    ApiNotFoundResponse({ description: notFound }),
    ApiConflictResponse({ description: conflict }),
    ApiServiceUnavailableResponse({
      description: 'Operations, Commerce or object storage is unavailable',
    }),
  ];
}

export function ApiInitiateSoundwaveUploadDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-009] Start a Soundwave audio upload (Customer)',
      description:
        'Requires Bearer auth and permission SOURCE_AUDIO_UPLOAD_OWN. Returns a presigned PUT URL (default 600 s) bound to the content type and length; the browser then PUTs the file with the returned uploadHeaders and calls complete. A new initiate for the same consent replaces an older PENDING upload. The bucket must allow CORS for the PUT. The response is sent with Cache-Control: no-store; never log or cache the URL.',
    }),
    ...commonErrors(
      'Validation failed, or reason AUDIO_DURATION_INVALID in the message (durationMs must be 3000..30000)',
      'Message carries the reason: ORDER_NOT_FOUND, CONSENT_NOT_FOUND',
      'Message carries the reason: P1_NOT_PAID, CONSENT_NOT_ACCEPTED, CONSENT_TYPE_MISMATCH, PACKAGE_MISMATCH, SOURCE_ALREADY_UPLOADED',
    ),
    ApiSuccessResponse({
      type: InitiateSoundwaveUploadResponseDto,
      status: 201,
      description: 'Upload started',
    }),
  );
}

export function ApiCompleteSoundwaveUploadDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-010] Complete a Soundwave audio upload (Customer)',
      description:
        'Requires Bearer auth and permission SOURCE_AUDIO_UPLOAD_OWN. Operations reads the uploaded object and checks size, SHA-256 and file signature against what initiate declared. On success the source is ACCEPTED, linked to the consent and bound to its Ring Items, and processing is queued. Optional body field wavecodeStyle (CLASSIC | HAIRLINE | OSCILLOSCOPE, default CLASSIC) picks the WAVECODE look; an unknown value answers 400. Idempotent for an ACCEPTED, PROCESSING or READY source. A missing object answers 422 UPLOAD_INVALID and keeps the upload PENDING (PUT again); any other mismatch deletes the upload (422 UPLOAD_INVALID, start over with initiate).',
    }),
    ...commonErrors(
      'Validation failed, or reason SEGMENT_OUT_OF_RANGE in the message',
      'Message carries the reason: ORDER_NOT_FOUND, UPLOAD_NOT_FOUND',
      'Message carries the reason: UPLOAD_NOT_PENDING, P1_NOT_PAID, CONSENT_NOT_ACCEPTED, CONSENT_TYPE_MISMATCH, PACKAGE_MISMATCH, SOURCE_ALREADY_UPLOADED, RING_ITEM_ALREADY_BOUND',
    ),
    ApiResponse({
      status: 422,
      description: 'Message carries the reason: UPLOAD_INVALID',
    }),
    ApiSuccessResponse({
      type: CompleteSoundwaveUploadResponseDto,
      description: 'Source accepted (or already accepted)',
    }),
  );
}
