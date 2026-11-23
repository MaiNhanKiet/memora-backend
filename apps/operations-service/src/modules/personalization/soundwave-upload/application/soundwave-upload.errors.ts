import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Reason codes travel as the exception message (same convention as Consent and capture):
 * 400 INVALID_ARGUMENT, 403 PERMISSION_DENIED, 404 NOT_FOUND, 409 ALREADY_EXISTS,
 * 412 FAILED_PRECONDITION (Gateway: 409), 503 UNAVAILABLE.
 * UPLOAD_INVALID is sent as INVALID_ARGUMENT; the Gateway client maps that reason to 422.
 */
export const SoundwaveUploadReason = {
  INVALID_ORDER_ID: 'INVALID_ORDER_ID',
  INVALID_CONSENT_ID: 'INVALID_CONSENT_ID',
  INVALID_UPLOAD_ID: 'INVALID_UPLOAD_ID',
  INVALID_CONTENT_TYPE: 'INVALID_CONTENT_TYPE',
  INVALID_SIZE: 'INVALID_SIZE',
  INVALID_SHA256: 'INVALID_SHA256',
  INVALID_ORIGIN: 'INVALID_ORIGIN',
  INVALID_SEGMENT_START: 'INVALID_SEGMENT_START',
  INVALID_WAVECODE_STYLE: 'INVALID_WAVECODE_STYLE',
  AUDIO_DURATION_INVALID: 'AUDIO_DURATION_INVALID',
  SEGMENT_OUT_OF_RANGE: 'SEGMENT_OUT_OF_RANGE',
  UPLOAD_INVALID: 'UPLOAD_INVALID',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_OWNED: 'ORDER_NOT_OWNED',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  UPLOAD_NOT_FOUND: 'UPLOAD_NOT_FOUND',
  P1_NOT_PAID: 'P1_NOT_PAID',
  CONSENT_NOT_ACCEPTED: 'CONSENT_NOT_ACCEPTED',
  CONSENT_TYPE_MISMATCH: 'CONSENT_TYPE_MISMATCH',
  PACKAGE_MISMATCH: 'PACKAGE_MISMATCH',
  SOURCE_ALREADY_UPLOADED: 'SOURCE_ALREADY_UPLOADED',
  UPLOAD_NOT_PENDING: 'UPLOAD_NOT_PENDING',
  RING_ITEM_ALREADY_BOUND: 'RING_ITEM_ALREADY_BOUND',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  PROCESSING_WORKER_UNAVAILABLE: 'PROCESSING_WORKER_UNAVAILABLE',
} as const;

export const soundwaveUploadErrors = {
  invalid: (reason: string) => new BadRequestException(reason),
  forbidden: (reason: string) => new ForbiddenException(reason),
  notFound: (reason: string) => new NotFoundException(reason),
  precondition: (reason: string) => new PreconditionFailedException(reason),
  alreadyExists: (reason: string) => new ConflictException(reason),
  storageUnavailable: () =>
    new ServiceUnavailableException(SoundwaveUploadReason.STORAGE_UNAVAILABLE),
  workerUnavailable: () =>
    new ServiceUnavailableException(
      SoundwaveUploadReason.PROCESSING_WORKER_UNAVAILABLE,
    ),
};
