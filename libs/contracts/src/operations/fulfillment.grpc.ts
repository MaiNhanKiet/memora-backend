import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';

export const FULFILLMENT_PACKAGE = 'memora.fulfillment.v1';
export const FULFILLMENT_SERVICE_NAME = 'FulfillmentService';

export interface GetFullOrderHandoverForRingItemRequest {
  readonly ringItemId: string;
}

export interface GetFullOrderHandoverForRingItemResponse {
  readonly completed: boolean;
  readonly orderId?: string;
}

export interface FulfillmentServiceHandler {
  getFullOrderHandoverForRingItem(
    request: GetFullOrderHandoverForRingItemRequest,
  ): Promise<GetFullOrderHandoverForRingItemResponse>;
}

export interface FulfillmentServiceClient {
  getFullOrderHandoverForRingItem(
    request: GetFullOrderHandoverForRingItemRequest,
    metadata?: Metadata,
  ): Observable<GetFullOrderHandoverForRingItemResponse>;
}
