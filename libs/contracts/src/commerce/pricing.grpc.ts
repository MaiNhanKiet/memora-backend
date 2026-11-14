// Contract gRPC của Commerce Pricing, khớp proto/commerce/v1/pricing.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';

export interface EstimatePriceRequest {
  templateVariantId: string;
  targetSize: number;
  gemstoneOptionIds: string[];
  personalizationPackage: string;
}

export interface PriceBreakdown {
  baseBlankPrice: number;
  gemstonesPrice: number;
  personalizationFee: number;
  resizeFee: number;
}

export interface GemstonePriceLineItem {
  gemstoneOptionId: string;
  price: number;
}

export interface EstimatePriceResponse {
  estimatedTotal: number;
  currency: string;
  estimatedAt: string;
  breakdown: PriceBreakdown;
  gemstoneLineItems: GemstonePriceLineItem[];
}

// Admin Price Items
export interface ListPriceItemsRequest {
  priceType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PriceItemResponse {
  id: string;
  priceType: string;
  templateVariantId?: string;
  gemstoneOptionId?: string;
  certifiedGemstoneId?: string;
  personalizationPackage?: string;
  code: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  activePriceVersion?: PriceVersionResponse;
}

export interface ListPriceItemsResponse {
  items: PriceItemResponse[];
  total: number;
}

export interface CreatePriceItemRequest {
  priceType: string;
  code: string;
  templateVariantId?: string;
  gemstoneOptionId?: string;
  certifiedGemstoneId?: string;
  personalizationPackage?: string;
  status?: string;
}

// Admin Price Versions
export interface ListPriceVersionsRequest {
  priceItemId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PriceVersionResponse {
  id: string;
  priceItemId: string;
  amount: number;
  currency: string;
  versionNo: number;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  sourceType: string;
  marketSnapshotJson?: string;
  reviewNote?: string;
  createdByUserId?: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ListPriceVersionsResponse {
  versions: PriceVersionResponse[];
  total: number;
}

export interface CreatePriceVersionRequest {
  priceItemId: string;
  amount: number;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  sourceType?: string;
  marketSnapshotJson?: string;
  createdByUserId?: string;
}

export interface ApprovePriceVersionRequest {
  versionId: string;
  reviewNote?: string;
  reviewedByUserId?: string;
}

export interface RejectPriceVersionRequest {
  versionId: string;
  reviewNote: string;
  reviewedByUserId?: string;
}

// Admin Pricing Rules
export interface ListPricingRulesRequest {
  ruleType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface PricingRuleResponse {
  id: string;
  ruleType: string;
  code: string;
  name: string;
  templateVariantId?: string;
  resizeDirection?: string;
  deliveryZoneCode?: string;
  cancellationStage?: string;
  redeliveryReason?: string;
  configJson?: string;
  versionNo: number;
  status: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdByUserId?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface ListPricingRulesResponse {
  rules: PricingRuleResponse[];
  total: number;
}

export interface CreatePricingRuleRequest {
  ruleType: string;
  code: string;
  name: string;
  templateVariantId?: string;
  resizeDirection?: string;
  deliveryZoneCode?: string;
  cancellationStage?: string;
  redeliveryReason?: string;
  configJson?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdByUserId?: string;
}

export interface ActivatePricingRuleRequest {
  ruleId: string;
  approvedByUserId?: string;
}

export interface PricingServiceClient {
  estimatePrice(
    request: EstimatePriceRequest,
    metadata?: Metadata,
  ): Observable<EstimatePriceResponse>;

  listPriceItems(
    request: ListPriceItemsRequest,
    metadata?: Metadata,
  ): Observable<ListPriceItemsResponse>;

  createPriceItem(
    request: CreatePriceItemRequest,
    metadata?: Metadata,
  ): Observable<PriceItemResponse>;

  listPriceVersions(
    request: ListPriceVersionsRequest,
    metadata?: Metadata,
  ): Observable<ListPriceVersionsResponse>;

  createPriceVersion(
    request: CreatePriceVersionRequest,
    metadata?: Metadata,
  ): Observable<PriceVersionResponse>;

  approvePriceVersion(
    request: ApprovePriceVersionRequest,
    metadata?: Metadata,
  ): Observable<PriceVersionResponse>;

  rejectPriceVersion(
    request: RejectPriceVersionRequest,
    metadata?: Metadata,
  ): Observable<PriceVersionResponse>;

  listPricingRules(
    request: ListPricingRulesRequest,
    metadata?: Metadata,
  ): Observable<ListPricingRulesResponse>;

  createPricingRule(
    request: CreatePricingRuleRequest,
    metadata?: Metadata,
  ): Observable<PricingRuleResponse>;

  activatePricingRule(
    request: ActivatePricingRuleRequest,
    metadata?: Metadata,
  ): Observable<PricingRuleResponse>;
}

export interface PricingServiceHandler {
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse>;
  listPriceItems(
    request: ListPriceItemsRequest,
  ): Promise<ListPriceItemsResponse>;
  createPriceItem(request: CreatePriceItemRequest): Promise<PriceItemResponse>;
  listPriceVersions(
    request: ListPriceVersionsRequest,
  ): Promise<ListPriceVersionsResponse>;
  createPriceVersion(
    request: CreatePriceVersionRequest,
  ): Promise<PriceVersionResponse>;
  approvePriceVersion(
    request: ApprovePriceVersionRequest,
  ): Promise<PriceVersionResponse>;
  rejectPriceVersion(
    request: RejectPriceVersionRequest,
  ): Promise<PriceVersionResponse>;
  listPricingRules(
    request: ListPricingRulesRequest,
  ): Promise<ListPricingRulesResponse>;
  createPricingRule(
    request: CreatePricingRuleRequest,
  ): Promise<PricingRuleResponse>;
  activatePricingRule(
    request: ActivatePricingRuleRequest,
  ): Promise<PricingRuleResponse>;
}
