/**
 * Order facts that Personalization needs from Commerce (D-P-04, decided 2026-11-13).
 * Commerce owns ordering.*; Operations never reads those tables. The data arrives
 * through Commerce `OrderingService.GetOrderPersonalizationContext` (spec:
 * docs/api/commerce/ordering-personalization-context.md). Until that RPC exists,
 * use cases depend on this port and tests use FakeOrderPersonalizationContext.
 *
 * No Nest, Prisma or gRPC types here, so domain and application code can use it.
 */

/** ordering.ring_item_versions.personalization_package (CHECK in db/). */
export type PersonalizationPackage = 'NONE' | 'FINGERPRINT' | 'SOUNDWAVE';

/** ordering.orders.source_plan_mode (CHECK in db/). Commerce owns it (D-P-05). */
export type SourcePlanMode = 'N/A' | 'SHARED' | 'SEPARATE';

export interface RingItemPersonalizationContext {
  readonly ringItemId: string;
  readonly itemNo: number;
  /** Undefined while Commerce has not created a version yet. */
  readonly currentVersionId: string | undefined;
  readonly personalizationPackage: PersonalizationPackage;
  /**
   * Commerce-owned status of the current version (MF01 §8.3: READY_FOR_REVIEW,
   * SUBMITTED, MANAGER_APPROVED, REQUEST_CHANGES, REVIEW_NOT_REQUIRED). The DB has
   * no CHECK yet, so it stays a string until Commerce publishes the enum.
   */
  readonly versionStatus: string;
}

export interface OrderPersonalizationContext {
  readonly orderId: string;
  readonly ownerCustomerIdentityId: string;
  /** Commerce-owned order status (MF02 §5.2 lifecycle). String until the enum is published. */
  readonly status: string;
  /** True only when a P1 payment for this order has SUCCEEDED (decided by Commerce). */
  readonly p1Paid: boolean;
  readonly sourcePlanMode: SourcePlanMode;
  readonly ringItems: readonly RingItemPersonalizationContext[];
}

export interface OrderPersonalizationContextPort {
  /**
   * Returns undefined when the order does not exist. Throws when Commerce is
   * unavailable, so callers fail closed instead of treating it as "not found".
   */
  getOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderPersonalizationContext | undefined>;
}

export const ORDER_PERSONALIZATION_CONTEXT_PORT = Symbol(
  'ORDER_PERSONALIZATION_CONTEXT_PORT',
);
