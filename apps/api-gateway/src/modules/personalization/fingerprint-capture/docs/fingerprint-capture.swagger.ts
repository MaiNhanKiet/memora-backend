import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../../../common/docs/api-success-response';
import { CaptureAttemptImageResponseDto } from '../dto/capture-attempt-image.response.dto';
import { CaptureSessionResponseDto } from '../dto/capture-session.response.dto';

function commonErrors(badRequest: string, notFound: string, conflict: string) {
  return [
    ApiBearerAuth(),
    ApiBadRequestResponse({ description: badRequest }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid credentials' }),
    ApiForbiddenResponse({ description: 'Missing SOURCE_CAPTURE' }),
    ApiNotFoundResponse({ description: notFound }),
    ApiConflictResponse({ description: conflict }),
    ApiServiceUnavailableResponse({
      description: 'Operations or Commerce is unavailable',
    }),
  ];
}

export function ApiCreateCaptureSessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-005] Create a fingerprint capture session (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. Status starts as CREATED; the device is told to start over MQTT.',
    }),
    ...commonErrors(
      'Validation failed, or reason UNKNOWN_DEVICE in the message',
      'Message carries the reason: ORDER_NOT_FOUND, CONSENT_NOT_FOUND',
      'Message carries the reason: P1_NOT_PAID, CONSENT_NOT_ACCEPTED, CONSENT_TYPE_MISMATCH, PACKAGE_MISMATCH, SESSION_ALREADY_OPEN, SOURCE_ALREADY_CAPTURED',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      status: 201,
      description: 'Capture session created',
    }),
  );
}

export function ApiGetCaptureSessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-006] Get a fingerprint capture session (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. Polled by the store tablet; several attempts can be PENDING_REVIEW at once (up to 3); applies lazy expiry. Attempts show result (PENDING_REVIEW while waiting for the staff), qualityScore and a threshold suggestion. Never returns images or biometric data.',
    }),
    ...commonErrors(
      'Validation failed',
      'Message carries the reason: SESSION_NOT_FOUND',
      'Conflict',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      description: 'Capture session',
    }),
  );
}

export function ApiCompleteCaptureSessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        '[PERSO-008] Complete a fingerprint capture session by choosing an attempt (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. Body attemptNo (1..3) names the PENDING_REVIEW attempt the staff accepts after viewing its image; the quality threshold is only a suggestion. The other PENDING_REVIEW attempts become not selected (NOT_SELECTED) and their images are deleted. Idempotent with the same attemptNo when already COMPLETED; another attemptNo returns 409 SESSION_NOT_OPEN.',
    }),
    ...commonErrors(
      'Validation failed (attemptNo must be an integer 1..3)',
      'Message carries the reason: SESSION_NOT_FOUND, ATTEMPT_NOT_FOUND',
      'Message carries the reason: ATTEMPT_NOT_REVIEWABLE, SESSION_NOT_OPEN, SESSION_EXPIRED, CONSENT_NOT_ACCEPTED, RING_ITEM_ALREADY_BOUND',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      description: 'Session COMPLETED with acceptedSourceId',
    }),
  );
}

export function ApiGetCaptureAttemptImageDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        '[PERSO-026] Get a capture attempt image URL for staff review (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. Returns a presigned URL valid 60 seconds for the image of a PENDING_REVIEW attempt (attemptNo 1..3) of an open (IN_PROGRESS, not expired) session. Several attempts can be PENDING_REVIEW at once: the staff reviews their images, then picks one by completing the session with that attemptNo (the others become NOT_SELECTED), or rejects attempts one by one. The response is sent with Cache-Control: no-store; the URL must not be cached or logged.',
    }),
    ...commonErrors(
      'Validation failed (sessionId must be a UUID, attemptNo an integer 1..3)',
      'Message carries the reason: SESSION_NOT_FOUND, ATTEMPT_NOT_FOUND',
      'Message carries the reason: ATTEMPT_NOT_REVIEWABLE, SESSION_NOT_OPEN, SESSION_EXPIRED',
    ),
    ApiSuccessResponse({
      type: CaptureAttemptImageResponseDto,
      description: 'Short-lived image URL (Cache-Control: no-store)',
    }),
  );
}

export function ApiRejectCaptureAttemptDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '[PERSO-027] Reject a pending capture attempt (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. No body. The PENDING_REVIEW attempt becomes REJECTED (STAFF_REJECTED), its image is deleted and it still counts as used; the session becomes FAILED when no attempts remain, otherwise it stays IN_PROGRESS.',
    }),
    ...commonErrors(
      'Validation failed (sessionId must be a UUID, attemptNo an integer 1..3)',
      'Message carries the reason: SESSION_NOT_FOUND, ATTEMPT_NOT_FOUND',
      'Message carries the reason: ATTEMPT_NOT_REVIEWABLE, SESSION_NOT_OPEN, SESSION_EXPIRED',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      description: 'Updated capture session',
    }),
  );
}

export function ApiNextCaptureAttemptDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        '[PERSO-028] Ask the device for the next capture attempt (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. No body. Asks the device over MQTT to capture another attempt while earlier attempts stay PENDING_REVIEW for the staff to compare. Returns the session.',
    }),
    ...commonErrors(
      'Validation failed (sessionId must be a UUID)',
      'Message carries the reason: SESSION_NOT_FOUND',
      'Message carries the reason: SESSION_NOT_OPEN, SESSION_EXPIRED, ATTEMPT_ALREADY_ACCEPTED, MAX_ATTEMPTS_REACHED',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      description: 'Capture session after the next attempt was requested',
    }),
  );
}

export function ApiCloseCaptureSessionDocs() {
  return applyDecorators(
    ApiOperation({
      summary:
        '[PERSO-029] Close a capture session without choosing (Store Staff)',
      description:
        'Requires Bearer auth and permission SOURCE_CAPTURE. No body. Ends the session without choosing an attempt: status becomes CANCELLED and pending attempt images are deleted. Idempotent for an already CANCELLED session.',
    }),
    ...commonErrors(
      'Validation failed (sessionId must be a UUID)',
      'Message carries the reason: SESSION_NOT_FOUND',
      'Message carries the reason: SESSION_NOT_OPEN',
    ),
    ApiSuccessResponse({
      type: CaptureSessionResponseDto,
      description: 'Session CANCELLED',
    }),
  );
}
