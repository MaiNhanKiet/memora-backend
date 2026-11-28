import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ActivatePricingRuleRequest,
  CreatePricingRuleRequest,
  ListPricingRulesRequest,
  ListPricingRulesResponse,
  PricingRuleResponse,
} from '@app/contracts';
import { parseJsonRecord, toPricingRuleResponse } from './pricing.mapper';
import {
  PRICING_REPOSITORY,
  type PricingRepository,
} from './pricing.repository';

@Injectable()
export class ListPricingRulesUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { rules, total } = await this.repository.findPricingRules({
      ruleType: request.ruleType,
      status: request.status,
      limit,
      offset,
    });

    return {
      rules: rules.map((r) => toPricingRuleResponse(r)),
      total,
    };
  }
}

@Injectable()
export class CreatePricingRuleUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    const latestVersion =
      await this.repository.getLatestVersionNoForPricingRule(
        request.ruleType,
        request.code,
      );

    const created = await this.repository.createPricingRule({
      ruleType: request.ruleType,
      code: request.code,
      name: request.name,
      templateVariantId: request.templateVariantId,
      resizeDirection: request.resizeDirection,
      deliveryZoneCode: request.deliveryZoneCode,
      cancellationStage: request.cancellationStage,
      redeliveryReason: request.redeliveryReason,
      configJson: parseJsonRecord(request.configJson),
      versionNo: latestVersion + 1,
      status: 'DRAFT',
      effectiveFrom: request.effectiveFrom
        ? new Date(request.effectiveFrom)
        : undefined,
      effectiveTo: request.effectiveTo
        ? new Date(request.effectiveTo)
        : undefined,
      createdByUserId: request.createdByUserId,
    });

    return toPricingRuleResponse(created);
  }
}

@Injectable()
export class ActivatePricingRuleUseCase {
  constructor(
    @Inject(PRICING_REPOSITORY)
    private readonly repository: PricingRepository,
  ) {}

  async execute(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse> {
    try {
      const activated = await this.repository.activatePricingRule(
        request.ruleId,
        request.approvedByUserId,
      );
      return toPricingRuleResponse(activated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PRICING_RULE_NOT_FOUND') {
          throw new NotFoundException(
            `Pricing rule ${request.ruleId} not found`,
          );
        }
        if (error.message === 'PRICING_RULE_NOT_DRAFT') {
          throw new UnprocessableEntityException(
            'Only DRAFT pricing rules can be activated',
          );
        }
      }
      throw error;
    }
  }
}
