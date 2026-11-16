import { Injectable } from '@nestjs/common';
import type {
  price_items,
  price_versions,
  pricing_rules,
} from '../../../../../generated/prisma/client';
import type {
  PriceItemResponse,
  PriceVersionResponse,
  PricingRuleResponse,
} from '@app/contracts';

@Injectable()
export class PricingMapper {
  toPriceVersionResponse(version: price_versions): PriceVersionResponse {
    return {
      id: version.id,
      priceItemId: version.price_item_id,
      amount: Number(version.amount),
      currency: version.currency,
      versionNo: version.version_no,
      status: version.status,
      effectiveFrom: version.effective_from?.toISOString(),
      effectiveTo: version.effective_to?.toISOString(),
      sourceType: version.source_type,
      marketSnapshotJson: version.market_snapshot_json
        ? JSON.stringify(version.market_snapshot_json)
        : undefined,
      reviewNote: version.review_note ?? undefined,
      createdByUserId: version.created_by_user_id ?? undefined,
      reviewedByUserId: version.reviewed_by_user_id ?? undefined,
      reviewedAt: version.reviewed_at?.toISOString(),
      createdAt: version.created_at.toISOString(),
    };
  }

  toPriceItemResponse(
    item: price_items & { price_versions?: price_versions | null },
  ): PriceItemResponse {
    return {
      id: item.id,
      priceType: item.price_type,
      templateVariantId: item.template_variant_id ?? undefined,
      gemstoneOptionId: item.gemstone_option_id ?? undefined,
      certifiedGemstoneId: item.certified_gemstone_id ?? undefined,
      personalizationPackage: item.personalization_package ?? undefined,
      code: item.code,
      status: item.status,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      activePriceVersion: item.price_versions
        ? this.toPriceVersionResponse(item.price_versions)
        : undefined,
    };
  }

  toPricingRuleResponse(rule: pricing_rules): PricingRuleResponse {
    return {
      id: rule.id,
      ruleType: rule.rule_type,
      code: rule.code,
      name: rule.name,
      templateVariantId: rule.template_variant_id ?? undefined,
      resizeDirection: rule.resize_direction ?? undefined,
      deliveryZoneCode: rule.delivery_zone_code ?? undefined,
      cancellationStage: rule.cancellation_stage ?? undefined,
      redeliveryReason: rule.redelivery_reason ?? undefined,
      configJson: rule.config_json
        ? JSON.stringify(rule.config_json)
        : undefined,
      versionNo: rule.version_no,
      status: rule.status,
      effectiveFrom: rule.effective_from?.toISOString(),
      effectiveTo: rule.effective_to?.toISOString(),
      createdByUserId: rule.created_by_user_id ?? undefined,
      approvedByUserId: rule.approved_by_user_id ?? undefined,
      approvedAt: rule.approved_at?.toISOString(),
      createdAt: rule.created_at.toISOString(),
    };
  }
}
