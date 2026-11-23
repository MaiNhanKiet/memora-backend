import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

/**
 * Reason codes travel as the exception message (same convention as Consent).
 * Status mapping: 400 INVALID_ARGUMENT, 403 PERMISSION_DENIED, 404 NOT_FOUND.
 */
export const SourceReason = {
  INVALID_ORDER_ID: 'INVALID_ORDER_ID',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_OWNED: 'ORDER_NOT_OWNED',
  INVALID_SOURCE_ID: 'INVALID_SOURCE_ID',
  SOURCE_NOT_FOUND: 'SOURCE_NOT_FOUND',
  SOURCE_NOT_READY: 'SOURCE_NOT_READY',
  SOURCE_BUSY: 'SOURCE_BUSY',
  RESEGMENT_LIMIT_REACHED: 'RESEGMENT_LIMIT_REACHED',
  SEGMENT_OUT_OF_RANGE: 'SEGMENT_OUT_OF_RANGE',
  INVALID_SEGMENT_START: 'INVALID_SEGMENT_START',
  INVALID_WAVECODE_STYLE: 'INVALID_WAVECODE_STYLE',
  WAVECODE_STYLE_LOCKED: 'WAVECODE_STYLE_LOCKED',
  PROCESSING_WORKER_UNAVAILABLE: 'PROCESSING_WORKER_UNAVAILABLE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
} as const;

export const sourceErrors = {
  invalid: (reason: string) => new BadRequestException(reason),
  forbidden: (reason: string) => new ForbiddenException(reason),
  notFound: (reason: string) => new NotFoundException(reason),
  conflict: (reason: string) => new ConflictException(reason),
  workerUnavailable: () =>
    new ServiceUnavailableException(SourceReason.PROCESSING_WORKER_UNAVAILABLE),
  storageUnavailable: () =>
    new ServiceUnavailableException(SourceReason.STORAGE_UNAVAILABLE),
};
