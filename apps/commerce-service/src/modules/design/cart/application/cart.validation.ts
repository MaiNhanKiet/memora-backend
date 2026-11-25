import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { parseVerifiedActor, type ParsedVerifiedActor } from '@app/common';
import type { VerifiedActor } from '@app/contracts';
import type { CartActor, CartDraftRecord } from './cart.repository';

export function validateCartActor(actor?: VerifiedActor): CartActor {
  const parsed: ParsedVerifiedActor = parseVerifiedActor(actor);
  if (parsed.kind === 'USER') {
    return { userId: parsed.userId };
  }
  if (parsed.kind === 'GUEST_SESSION') {
    return { guestSessionId: parsed.guestSessionId };
  }
  throw new BadRequestException('Unsupported actor kind for cart operations');
}

export function assertDraftOwnership(
  draft: CartDraftRecord,
  actor: CartActor,
): void {
  if (
    actor.userId &&
    draft.cartOwnerUserId &&
    actor.userId === draft.cartOwnerUserId
  ) {
    return;
  }
  if (
    actor.guestSessionId &&
    draft.cartGuestSessionId &&
    actor.guestSessionId === draft.cartGuestSessionId
  ) {
    return;
  }

  throw new ForbiddenException(
    'You do not have permission to manage this cart item',
  );
}

export function assertShareLinkDraftOwnership(
  draft: CartDraftRecord,
  actor: CartActor,
  requireGuestMatch = false,
): void {
  if (actor.userId && draft.ownerUserId && draft.ownerUserId !== actor.userId) {
    throw new ForbiddenException('You do not own this design draft');
  }
  if (
    requireGuestMatch &&
    actor.guestSessionId &&
    draft.guestSessionId &&
    draft.guestSessionId !== actor.guestSessionId
  ) {
    throw new ForbiddenException('You do not own this design draft');
  }
}
