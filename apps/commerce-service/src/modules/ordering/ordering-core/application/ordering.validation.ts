import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  parseVerifiedActor,
  requireCustomerActor,
  type ParsedVerifiedActor,
} from '@app/common';
import type { VerifiedActor } from '@app/contracts';
import type { OrderingDraftRecord } from './ordering.repository';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OrderingActor =
  | {
      readonly kind: 'USER';
      readonly userId: string;
      readonly customerIdentityId: string;
    }
  | {
      readonly kind: 'VERIFIED_GUEST';
      readonly customerIdentityId: string;
    }
  | {
      readonly kind: 'GUEST_SESSION';
      readonly guestSessionId: string;
    };

export function validateOrderingActor(actor?: VerifiedActor): OrderingActor {
  const parsed: ParsedVerifiedActor = parseVerifiedActor(actor);
  if (parsed.kind === 'USER') {
    const customer = requireCustomerActor(parsed);
    return {
      kind: 'USER',
      userId: customer.userId,
      customerIdentityId: customer.customerIdentityId,
    };
  }
  if (parsed.kind === 'VERIFIED_GUEST') {
    return {
      kind: 'VERIFIED_GUEST',
      customerIdentityId: parsed.customerIdentityId,
    };
  }
  return {
    kind: 'GUEST_SESSION',
    guestSessionId: parsed.guestSessionId,
  };
}

export function resolveOrderingActorId(actor: OrderingActor): {
  readonly actorId: string;
  readonly guestSessionId?: string;
} {
  if (actor.kind === 'GUEST_SESSION') {
    return {
      actorId: actor.guestSessionId,
      guestSessionId: actor.guestSessionId,
    };
  }
  return {
    actorId: actor.customerIdentityId,
    guestSessionId: undefined,
  };
}

export function assertOrderingDraftsOwnedByActor(
  drafts: readonly OrderingDraftRecord[],
  actor: OrderingActor,
): void {
  for (const draft of drafts) {
    if (actor.kind === 'USER') {
      const draftOwnerUserId = draft.ownerUserId ?? draft.cartOwnerUserId;
      if (draftOwnerUserId !== actor.userId) {
        throw new ForbiddenException(
          'You do not have permission to create an order with one or more selected drafts',
        );
      }
      continue;
    }

    if (actor.kind === 'GUEST_SESSION') {
      const hasUserOwner = Boolean(draft.ownerUserId || draft.cartOwnerUserId);
      const draftGuestId = draft.guestSessionId ?? draft.cartGuestSessionId;
      if (hasUserOwner || draftGuestId !== actor.guestSessionId) {
        throw new ForbiddenException(
          'You do not have permission to create an order with one or more selected drafts',
        );
      }
      continue;
    }

    if (
      draft.ownerUserId ||
      draft.cartOwnerUserId ||
      draft.guestSessionId ||
      draft.cartGuestSessionId
    ) {
      throw new ForbiddenException(
        'You do not have permission to create an order with one or more selected drafts',
      );
    }
  }
}

export function validateOrderUuid(rawOrderId?: string): string {
  const orderId = rawOrderId?.trim();
  if (!orderId || !UUID_REGEX.test(orderId)) {
    throw new BadRequestException(
      `Invalid or missing orderId: '${orderId}' is not a valid UUID`,
    );
  }
  return orderId;
}

export function parseDeliveryAddressJson(
  raw?: string,
): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { raw };
  } catch {
    return { raw };
  }
}
