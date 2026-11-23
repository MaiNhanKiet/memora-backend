import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';

/**
 * Reason codes travel as the exception message (same convention as Consent):
 * 400 INVALID_ARGUMENT, 404 NOT_FOUND, 409 ALREADY_EXISTS, 412 FAILED_PRECONDITION.
 * The Gateway maps ALREADY_EXISTS and FAILED_PRECONDITION to HTTP 409.
 */
export const CaptureReason = {
  INVALID_ORDER_ID: 'INVALID_ORDER_ID',
  INVALID_CONSENT_ID: 'INVALID_CONSENT_ID',
  INVALID_SESSION_ID: 'INVALID_SESSION_ID',
  INVALID_ATTEMPT_NO: 'INVALID_ATTEMPT_NO',
  INVALID_DEVICE_CODE: 'INVALID_DEVICE_CODE',
  UNKNOWN_DEVICE: 'UNKNOWN_DEVICE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  P1_NOT_PAID: 'P1_NOT_PAID',
  CONSENT_NOT_ACCEPTED: 'CONSENT_NOT_ACCEPTED',
  CONSENT_TYPE_MISMATCH: 'CONSENT_TYPE_MISMATCH',
  PACKAGE_MISMATCH: 'PACKAGE_MISMATCH',
  SESSION_ALREADY_OPEN: 'SESSION_ALREADY_OPEN',
  SOURCE_ALREADY_CAPTURED: 'SOURCE_ALREADY_CAPTURED',
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  ATTEMPT_NOT_REVIEWABLE: 'ATTEMPT_NOT_REVIEWABLE',
  SESSION_NOT_OPEN: 'SESSION_NOT_OPEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ATTEMPT_ALREADY_ACCEPTED: 'ATTEMPT_ALREADY_ACCEPTED',
  MAX_ATTEMPTS_REACHED: 'MAX_ATTEMPTS_REACHED',
  RING_ITEM_ALREADY_BOUND: 'RING_ITEM_ALREADY_BOUND',
} as const;

export const captureErrors = {
  invalid: (reason: string) => new BadRequestException(reason),
  forbidden: (reason: string) => new ForbiddenException(reason),
  notFound: (reason: string) => new NotFoundException(reason),
  precondition: (reason: string) => new PreconditionFailedException(reason),
  alreadyExists: (reason: string) => new ConflictException(reason),
};

/** Error codes the device sees in MQTT `results` messages (PERSO-007). */
export const DEVICE_ERROR_REASONS = [
  'INVALID_MESSAGE',
  'SESSION_NOT_FOUND',
  'DEVICE_MISMATCH',
  'SESSION_NOT_OPEN',
  'SESSION_EXPIRED',
  'MAX_ATTEMPTS_REACHED',
  'ATTEMPT_ALREADY_ACCEPTED',
  // No longer produced since 2026-11-17; kept so the public list stays compatible.
  'REVIEW_PENDING',
  'IMAGE_TOO_LARGE',
  'DUPLICATE_NONCE',
  'INTERNAL_ERROR',
] as const;
export type DeviceErrorReason = (typeof DEVICE_ERROR_REASONS)[number];
