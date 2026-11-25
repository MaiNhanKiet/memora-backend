import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  ValidateCheckoutRequest,
  ValidateCheckoutResponse,
} from '@app/contracts';
import { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
import { parseGemstoneSelections } from './cart.mapper';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import { validateCartActor } from './cart.validation';

@Injectable()
export class ValidateCheckoutUseCase {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly repository: CartRepository,
    private readonly estimatePriceUseCase: EstimatePriceUseCase,
  ) {}

  async execute(
    request: ValidateCheckoutRequest,
  ): Promise<ValidateCheckoutResponse> {
    const actor = validateCartActor(request.actor);
    const cart = await this.repository.findActiveCartByActor(actor);

    if (!cart || cart.drafts.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const selectedDraftIds = request.selectedDraftIds || [];
    if (selectedDraftIds.length === 0) {
      throw new BadRequestException('At least one draft must be selected');
    }

    if (selectedDraftIds.length > 2) {
      throw new BadRequestException(
        'A single order can contain at most 2 ring items (single or matching pair)',
      );
    }

    const issues: { draftId: string; code: string; message: string }[] = [];
    let totalEstimatedPrice = 0;

    for (const draftId of selectedDraftIds) {
      const draft = cart.drafts.find((d) => d.id === draftId);
      if (!draft) {
        issues.push({
          draftId,
          code: 'DRAFT_NOT_IN_CART',
          message: `Draft ${draftId} does not belong to active cart`,
        });
        continue;
      }

      try {
        const gemstoneSelections = parseGemstoneSelections(
          draft.gemstoneConfigJson,
        );
        const pricing = await this.estimatePriceUseCase.execute({
          templateVariantId: draft.templateVariantId,
          targetSize: draft.targetSize,
          gemstoneOptionIds: gemstoneSelections.map((g) => g.gemstoneOptionId),
          personalizationPackage: draft.personalizationPackage,
        });
        totalEstimatedPrice += pricing.estimatedTotal;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Validation failed';
        issues.push({
          draftId,
          code: 'REPRICING_FAILED',
          message,
        });
      }
    }

    return {
      isValid: issues.length === 0,
      totalEstimatedPrice,
      currency: 'VND',
      issues,
    };
  }
}
