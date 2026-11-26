import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { MemoryCardRepository } from './memory-card.repository';
import type { PinHasher } from './pin-hasher';

export const PIN_REGEX = /^\d{4,6}$/;
export const MAX_PIN_FAILED_ATTEMPTS = 5;
export const PIN_LOCK_DURATION_MS = 15 * 60 * 1000;

export function assertValidPinFormat(pin: string, errorMessage: string): void {
  if (!PIN_REGEX.test(pin)) {
    throw new BadRequestException(errorMessage);
  }
}

export async function verifyCardPinWithLockout(params: {
  readonly cardId: string;
  readonly pinHash: string;
  readonly pinLockedUntil?: Date;
  readonly inputPin?: string;
  readonly missingPinMessage: string;
  readonly lockedMessage: (waitMinutes: number) => string;
  readonly wrongPinMessages: {
    readonly locked: string;
    readonly remaining: (left: number) => string;
  };
  readonly pinHasher: PinHasher;
  readonly cardRepository: MemoryCardRepository;
  readonly requireNonEmptyInput?: boolean;
}): Promise<void> {
  const now = new Date();
  if (params.pinLockedUntil && params.pinLockedUntil > now) {
    const waitMinutes = Math.ceil(
      (params.pinLockedUntil.getTime() - now.getTime()) / 60000,
    );
    throw new ForbiddenException(params.lockedMessage(waitMinutes));
  }

  if (params.requireNonEmptyInput !== false && !params.inputPin) {
    throw new BadRequestException(params.missingPinMessage);
  }

  const isMatch = await params.pinHasher.verify(
    params.pinHash,
    params.inputPin ?? '',
  );
  const result = await params.cardRepository.applyPinVerification({
    cardId: params.cardId,
    expectedPinHash: params.pinHash,
    matches: isMatch,
    maxFailedAttempts: MAX_PIN_FAILED_ATTEMPTS,
    lockDurationMs: PIN_LOCK_DURATION_MS,
  });
  if (result.kind === 'stale') {
    throw new ForbiddenException(
      'Trạng thái mã PIN đã thay đổi. Vui lòng thử lại.',
    );
  }
  if (result.kind === 'locked') {
    const waitMinutes = Math.max(
      1,
      Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60000),
    );
    throw new ForbiddenException(params.lockedMessage(waitMinutes));
  }
  if (result.kind === 'invalid') {
    const attempts = result.failedAttempts;
    throw new BadRequestException(
      attempts >= MAX_PIN_FAILED_ATTEMPTS
        ? params.wrongPinMessages.locked
        : params.wrongPinMessages.remaining(MAX_PIN_FAILED_ATTEMPTS - attempts),
    );
  }
}
