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

export interface PricingServiceClient {
  estimatePrice(
    request: EstimatePriceRequest,
    metadata?: Metadata,
  ): Observable<EstimatePriceResponse>;
}

export interface PricingServiceHandler {
  estimatePrice(request: EstimatePriceRequest): Promise<EstimatePriceResponse>;
}
