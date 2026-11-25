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
  readonly pinFailedAttempts: number;
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
  if (!isMatch) {
    const attempts = params.pinFailedAttempts + 1;
    const lockedUntil =
      attempts >= MAX_PIN_FAILED_ATTEMPTS
        ? new Date(now.getTime() + PIN_LOCK_DURATION_MS)
        : undefined;
    await params.cardRepository.recordFailedPinAttempt(
      params.cardId,
      attempts,
      lockedUntil,
    );
    throw new BadRequestException(
      attempts >= MAX_PIN_FAILED_ATTEMPTS
        ? params.wrongPinMessages.locked
        : params.wrongPinMessages.remaining(MAX_PIN_FAILED_ATTEMPTS - attempts),
    );
  }
}
