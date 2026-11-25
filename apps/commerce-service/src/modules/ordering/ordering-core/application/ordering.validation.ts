import { BadRequestException } from '@nestjs/common';
import { parseVerifiedActor, type ParsedVerifiedActor } from '@app/common';
import type { VerifiedActor } from '@app/contracts';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OrderingActor {
  readonly userId?: string;
  readonly guestSessionId?: string;
}

export function validateOrderingActor(actor?: VerifiedActor): OrderingActor {
  const parsed: ParsedVerifiedActor = parseVerifiedActor(actor);
  if (parsed.kind === 'USER') {
    return { userId: parsed.userId };
  }
  if (parsed.kind === 'GUEST_SESSION') {
    return { guestSessionId: parsed.guestSessionId };
  }
  if (parsed.kind === 'VERIFIED_GUEST') {
    return { userId: parsed.customerIdentityId };
  }
  throw new BadRequestException('Invalid actor');
}

export function resolveOrderingActorId(actor: OrderingActor): {
  readonly actorId: string;
  readonly guestSessionId?: string;
} {
  return {
    actorId: actor.userId ?? actor.guestSessionId!,
    guestSessionId: actor.userId ? undefined : actor.guestSessionId,
  };
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
