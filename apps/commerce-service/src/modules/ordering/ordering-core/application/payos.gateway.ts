export interface PayosCreatePaymentLinkParams {
  readonly orderCode: number;
  readonly amount: number;
  readonly description: string;
  readonly returnUrl: string;
  readonly cancelUrl: string;
  readonly expiredAt?: number;
  readonly items?: ReadonlyArray<{
    readonly name: string;
    readonly quantity: number;
    readonly price: number;
  }>;
}

export interface PayosPaymentLinkData {
  readonly bin: string;
  readonly accountNumber: string;
  readonly accountName: string;
  readonly amount: number;
  readonly description: string;
  readonly orderCode: number;
  readonly currency: string;
  readonly paymentLinkId: string;
  readonly status: string;
  readonly checkoutUrl: string;
  readonly qrCode: string;
}

export interface PayosWebhookData {
  readonly orderCode: number;
  readonly amount: number;
  readonly description: string;
  readonly accountNumber: string;
  readonly reference: string;
  readonly transactionDateTime: string;
  readonly currency: string;
  readonly paymentLinkId: string;
  readonly code: string;
  readonly desc: string;
}

export interface PayosWebhookPayload {
  readonly code: string;
  readonly desc: string;
  readonly success: boolean;
  readonly data: Record<string, unknown>;
  readonly signature: string;
}

export interface PayosPaymentInfo {
  readonly status: string;
  readonly amount: number;
  readonly amountPaid: number;
  readonly amountRemaining: number;
  readonly orderCode: number;
  readonly id: string;
}

export interface PayosGateway {
  generateOrderCode(): number;
  createPaymentLink(
    params: PayosCreatePaymentLinkParams,
  ): Promise<PayosPaymentLinkData>;
  verifyWebhookSignature(payload: PayosWebhookPayload): boolean;
  getPaymentInformation(orderCode: number): Promise<PayosPaymentInfo | null>;
}

export const PAYOS_GATEWAY = Symbol('PAYOS_GATEWAY');
