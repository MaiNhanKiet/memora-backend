import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Reason codes travel as the exception message (same convention as Consent).
 * Status mapping: 400 INVALID_ARGUMENT, 403 PERMISSION_DENIED, 404 NOT_FOUND.
 */
export const SourceReason = {
  INVALID_ORDER_ID: 'INVALID_ORDER_ID',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_NOT_OWNED: 'ORDER_NOT_OWNED',
} as const;

export const sourceErrors = {
  invalid: (reason: string) => new BadRequestException(reason),
  forbidden: (reason: string) => new ForbiddenException(reason),
  notFound: (reason: string) => new NotFoundException(reason),
};
