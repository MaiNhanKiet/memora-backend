import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  ValidateCheckoutRequest,
  ValidateCheckoutResponse,
} from '@app/contracts';
import { EstimatePriceUseCase } from '../../../pricing/pricing-core/application/estimate-price.use-case';
import {
  extractCertifiedPriceVersionIds,
  extractMaintenancePlan,
  parseGemstoneSelections,
} from './cart.mapper';
import { CART_REPOSITORY, type CartRepository } from './cart.repository';
import { priceCartSelections, validateCartActor } from './cart.validation';

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

    if (new Set(selectedDraftIds).size !== selectedDraftIds.length) {
      throw new BadRequestException('A draft can only be selected once');
    }

    const selectedCertifiedIds = new Set<string>();
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
        const certifiedIds = gemstoneSelections.flatMap(
          ({ certifiedGemstoneId }) =>
            certifiedGemstoneId ? [certifiedGemstoneId.toLowerCase()] : [],
        );
        if (certifiedIds.some((id) => selectedCertifiedIds.has(id))) {
          throw new BadRequestException(
            'A certified gemstone cannot be used in two ring items',
          );
        }
        certifiedIds.forEach((id) => selectedCertifiedIds.add(id));
        const pricing = await priceCartSelections(
          this.repository,
          this.estimatePriceUseCase,
          {
            templateVariantId: draft.templateVariantId,
            targetSize: draft.targetSize,
            personalizationPackage: draft.personalizationPackage,
            maintenancePlan: extractMaintenancePlan(draft.gemstoneConfigJson),
          },
          gemstoneSelections,
        );
        const storedPriceIds = extractCertifiedPriceVersionIds(
          draft.gemstoneConfigJson,
        );
        if (
          storedPriceIds.join(',') !==
          pricing.certifiedPriceVersionIds.join(',')
        ) {
          throw new BadRequestException(
            'Certified gemstone price changed. Update your cart item before placing the order',
          );
        }
        totalEstimatedPrice += pricing.total;
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
