import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from '@nestjs/common';

/**
 * Reason codes travel as the exception message. GrpcExceptionFilter keeps a safe
 * message for 4xx, so the Gateway reads the gRPC details as a stable code.
 * Status mapping: 400 INVALID_ARGUMENT, 403 PERMISSION_DENIED, 404 NOT_FOUND,
 * 409 ALREADY_EXISTS, 412 FAILED_PRECONDITION.
 */
export const ConsentReason = {
  INVALID_ORDER_ID: 'INVALID_ORDER_ID',
  INVALID_CONSENT_ID: 'INVALID_CONSENT_ID',
  INVALID_CONSENT_TYPE: 'INVALID_CONSENT_TYPE',
  INVALID_POLICY_VERSION: 'INVALID_POLICY_VERSION',
  INVALID_RING_ITEM_IDS: 'INVALID_RING_ITEM_IDS',
  ORDER_NOT_OWNED: 'ORDER_NOT_OWNED',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  CONSENT_NOT_FOUND: 'CONSENT_NOT_FOUND',
  P1_NOT_PAID: 'P1_NOT_PAID',
  POLICY_VERSION_MISMATCH: 'POLICY_VERSION_MISMATCH',
  RING_ITEM_NOT_IN_ORDER: 'RING_ITEM_NOT_IN_ORDER',
  PACKAGE_MISMATCH: 'PACKAGE_MISMATCH',
  SHARED_SCOPE_NOT_ALLOWED: 'SHARED_SCOPE_NOT_ALLOWED',
  ITEM_ALREADY_CONSENTED: 'ITEM_ALREADY_CONSENTED',
  CONSENT_LOCKED: 'CONSENT_LOCKED',
} as const;

export const consentErrors = {
  invalid: (reason: string) => new BadRequestException(reason),
  forbidden: (reason: string) => new ForbiddenException(reason),
  notFound: (reason: string) => new NotFoundException(reason),
  precondition: (reason: string) => new PreconditionFailedException(reason),
  alreadyExists: (reason: string) => new ConflictException(reason),
};
