import type {
  ActivatePricingRuleRequest,
  CreatePricingRuleRequest,
  ListPricingRulesRequest,
} from '@app/contracts';
import type {
  CreatePricingRuleBodyDto,
  ListPricingRulesQueryDto,
} from '../dto';

export function toListPricingRulesGrpcRequest(
  query: ListPricingRulesQueryDto,
): ListPricingRulesRequest {
  return {
    ruleType: query.ruleType,
    status: query.status,
    limit: query.limit,
    offset: query.offset,
  };
}

export function toCreatePricingRuleGrpcRequest(
  body: CreatePricingRuleBodyDto,
  userId?: string,
): CreatePricingRuleRequest {
  return {
    ruleType: body.ruleType,
    code: body.code,
    name: body.name,
    templateVariantId: body.templateVariantId,
    resizeDirection: body.resizeDirection,
    deliveryZoneCode: body.deliveryZoneCode,
    cancellationStage: body.cancellationStage,
    redeliveryReason: body.redeliveryReason,
    configJson: body.config ? JSON.stringify(body.config) : undefined,
    effectiveFrom: body.effectiveFrom,
    effectiveTo: body.effectiveTo,
    createdByUserId: userId,
  };
}

export function toActivatePricingRuleGrpcRequest(
  ruleId: string,
  userId?: string,
): ActivatePricingRuleRequest {
  return {
    ruleId,
    approvedByUserId: userId,
  };
}
