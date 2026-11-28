import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { parseVerifiedActor, type ParsedVerifiedActor } from '@app/common';
import type {
  EstimatePriceRequest,
  GemstoneSelectionItem,
  VerifiedActor,
} from '@app/contracts';
import type { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
import type {
  CartActor,
  CartDraftRecord,
  CartRepository,
} from './cart.repository';

export async function priceCartSelections(
  repository: CartRepository,
  estimatePrice: EstimatePriceUseCase,
  request: Omit<EstimatePriceRequest, 'gemstoneOptionIds'>,
  selections: readonly GemstoneSelectionItem[],
): Promise<{
  total: number;
  currency: string;
  certifiedPriceVersionIds: string[];
}> {
  const validated = await repository.validateGemstoneSelections(
    request.templateVariantId,
    selections,
  );
  const base = await estimatePrice.execute({
    ...request,
    gemstoneOptionIds: validated
      .filter(({ certifiedGemstoneId }) => !certifiedGemstoneId)
      .map(({ optionId }) => optionId),
  });
  return {
    total: validated.reduce(
      (total, selection) =>
        total + (selection.certifiedGemstoneId ? selection.certifiedPrice : 0),
      base.estimatedTotal,
    ),
    currency: base.currency,
    certifiedPriceVersionIds: validated.flatMap((selection) =>
      selection.certifiedGemstoneId ? [selection.priceVersionId] : [],
    ),
  };
}

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
): void {
  const ownsUserDraft =
    actor.userId && draft.ownerUserId === actor.userId && !draft.guestSessionId;
  const ownsGuestDraft =
    actor.guestSessionId &&
    draft.guestSessionId === actor.guestSessionId &&
    !draft.ownerUserId;

  if (!ownsUserDraft && !ownsGuestDraft) {
    throw new ForbiddenException('You do not own this design draft');
  }
}
