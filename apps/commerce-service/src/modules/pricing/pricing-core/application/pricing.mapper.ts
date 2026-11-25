import type {
  PriceItemResponse,
  PriceVersionResponse,
  PricingRuleResponse,
} from '@app/contracts';
import type {
  PriceItemRecord,
  PriceVersionRecord,
  PricingRuleRecord,
} from './pricing.repository';

export function parseJsonRecord(raw?: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function parseOptionalJsonRecord(
  raw?: string,
): Record<string, unknown> | undefined {
  if (!raw) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function toPriceVersionResponse(
  version: PriceVersionRecord,
): PriceVersionResponse {
  return {
    id: version.id,
    priceItemId: version.priceItemId,
    amount: version.amount,
    currency: version.currency,
    versionNo: version.versionNo,
    status: version.status,
    effectiveFrom: version.effectiveFrom?.toISOString(),
    effectiveTo: version.effectiveTo?.toISOString(),
    sourceType: version.sourceType,
    marketSnapshotJson: version.marketSnapshotJson
      ? JSON.stringify(version.marketSnapshotJson)
      : undefined,
    reviewNote: version.reviewNote,
    createdByUserId: version.createdByUserId,
    reviewedByUserId: version.reviewedByUserId,
    reviewedAt: version.reviewedAt?.toISOString(),
    createdAt: version.createdAt.toISOString(),
  };
}

export function toPriceItemResponse(item: PriceItemRecord): PriceItemResponse {
  return {
    id: item.id,
    priceType: item.priceType,
    templateVariantId: item.templateVariantId,
    gemstoneOptionId: item.gemstoneOptionId,
    certifiedGemstoneId: item.certifiedGemstoneId,
    personalizationPackage: item.personalizationPackage,
    code: item.code,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    activePriceVersion: item.activePriceVersion
      ? toPriceVersionResponse(item.activePriceVersion)
      : undefined,
  };
}

export function toPricingRuleResponse(
  rule: PricingRuleRecord,
): PricingRuleResponse {
  return {
    id: rule.id,
    ruleType: rule.ruleType,
    code: rule.code,
    name: rule.name,
    templateVariantId: rule.templateVariantId,
    resizeDirection: rule.resizeDirection,
    deliveryZoneCode: rule.deliveryZoneCode,
    cancellationStage: rule.cancellationStage,
    redeliveryReason: rule.redeliveryReason,
    configJson: rule.configJson ? JSON.stringify(rule.configJson) : undefined,
    versionNo: rule.versionNo,
    status: rule.status,
    effectiveFrom: rule.effectiveFrom?.toISOString(),
    effectiveTo: rule.effectiveTo?.toISOString(),
    createdByUserId: rule.createdByUserId,
    approvedByUserId: rule.approvedByUserId,
    approvedAt: rule.approvedAt?.toISOString(),
    createdAt: rule.createdAt.toISOString(),
  };
}
