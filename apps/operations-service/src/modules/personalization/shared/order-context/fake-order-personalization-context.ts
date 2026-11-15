import type {
  OrderPersonalizationContext,
  OrderPersonalizationContextPort,
} from './order-personalization-context.port';

/**
 * Test double for OrderPersonalizationContextPort. For unit and integration tests only;
 * never register it in a production module (D-P-04: no production fake).
 */
export class FakeOrderPersonalizationContext implements OrderPersonalizationContextPort {
  private readonly orders = new Map<string, OrderPersonalizationContext>();
  private unavailableError: Error | undefined;
  readonly requestedOrderIds: string[] = [];

  /** Adds or replaces an order the fake will return. */
  withOrder(order: OrderPersonalizationContext): this {
    this.orders.set(order.orderId, order);
    return this;
  }

  /** Makes every call reject, to test fail-closed behaviour when Commerce is down. */
  failWith(error: Error): this {
    this.unavailableError = error;
    return this;
  }

  getOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderPersonalizationContext | undefined> {
    this.requestedOrderIds.push(orderId);
    if (this.unavailableError !== undefined) {
      return Promise.reject(this.unavailableError);
    }
    return Promise.resolve(this.orders.get(orderId));
  }
}
