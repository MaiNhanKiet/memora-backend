import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  PayosCreatePaymentLinkParams,
  PayosPaymentLinkData,
  PayosWebhookPayload,
} from './payos.interface';

@Injectable()
export class PayosProvider {
  private readonly logger = new Logger(PayosProvider.name);
  private readonly clientId?: string;
  private readonly apiKey?: string;
  private readonly checksumKey?: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    this.apiKey = this.configService.get<string>('PAYOS_API_KEY');
    this.checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
    this.isConfigured = Boolean(
      this.clientId && this.apiKey && this.checksumKey,
    );

    if (!this.isConfigured) {
      this.logger.warn(
        'PayOS credentials not found (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY). Running in Mock/Simulator mode.',
      );
    }
  }

  generateOrderCode(): number {
    // PayOS requires a positive integer <= 9007199254740991
    return (
      Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000)
    );
  }

  async createPaymentLink(
    params: PayosCreatePaymentLinkParams,
  ): Promise<PayosPaymentLinkData> {
    if (!this.isConfigured) {
      this.logger.log(
        `[MOCK PayOS] Creating simulated payment link for orderCode: ${params.orderCode}, amount: ${params.amount}`,
      );
      const mockLinkId = `pl_${params.orderCode}`;
      const checkoutUrl = `https://pay.payos.vn/web/${mockLinkId}`;
      const qrCode = `00020101021238540010A000000727012400069704220110${params.orderCode}5303704540${params.amount}5802VN62140810${mockLinkId}6304MOCK`;

      return {
        bin: '970422',
        accountNumber: '103870000000',
        accountName: 'MEMORA JEWELRY',
        amount: params.amount,
        description: params.description,
        orderCode: params.orderCode,
        currency: 'VND',
        paymentLinkId: mockLinkId,
        status: 'PENDING',
        checkoutUrl,
        qrCode,
      };
    }

    // Call live PayOS API using native fetch
    try {
      const description = (
        params.description || `MEMORA ${params.orderCode}`
      ).slice(0, 25);
      const signatureData = `amount=${params.amount}&cancelUrl=${params.cancelUrl}&description=${description}&orderCode=${params.orderCode}&returnUrl=${params.returnUrl}`;
      const signature = crypto
        .createHmac('sha256', this.checksumKey!)
        .update(signatureData)
        .digest('hex');

      const body = {
        orderCode: params.orderCode,
        amount: params.amount,
        description,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        items: params.items || [],
        signature,
      };

      const response = await fetch(
        'https://api-merchant.payos.vn/v2/payment-requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': this.clientId!,
            'x-api-key': this.apiKey!,
          },
          body: JSON.stringify(body),
        },
      );

      const resData = (await response.json()) as {
        code: string;
        desc: string;
        data?: PayosPaymentLinkData;
      };

      if (resData.code !== '00' || !resData.data) {
        this.logger.error(
          `PayOS API error response: ${JSON.stringify(resData)}`,
        );
        throw new Error(`PayOS API error: [${resData.code}] ${resData.desc}`);
      }

      return resData.data;
    } catch (err) {
      this.logger.error(
        'Failed to create PayOS payment link via live API',
        err,
      );
      throw err;
    }
  }

  verifyWebhookSignature(payload: PayosWebhookPayload): boolean {
    if (!this.isConfigured) {
      // In mock mode, if signature is "mock-signature" or any non-empty in test, accept
      return true;
    }

    const { data, signature } = payload;
    if (!data || !signature) {
      return false;
    }

    const formatValue = (val: unknown): string => {
      if (val === null || val === undefined) {
        return '';
      }
      if (typeof val === 'string') {
        return val;
      }
      if (typeof val === 'number' || typeof val === 'boolean') {
        return val.toString();
      }
      if (Array.isArray(val) || typeof val === 'object') {
        return JSON.stringify(val);
      }
      return '';
    };

    // PayOS sorted key signature calculation:
    // amount, cancelUrl (if any), description, orderCode, returnUrl, etc.
    const dataRecord = data as unknown as Record<string, unknown>;
    const sortedKeys = Object.keys(dataRecord).sort();
    const signString = sortedKeys
      .map((k) => `${k}=${formatValue(dataRecord[k])}`)
      .join('&');

    const expectedSignature = crypto
      .createHmac('sha256', this.checksumKey!)
      .update(signString)
      .digest('hex');

    return signature === expectedSignature;
  }

  async getPaymentInformation(
    orderCode: number,
  ): Promise<{ status: string; amount: number; orderCode: number } | null> {
    if (!this.isConfigured) {
      this.logger.log(
        `[MOCK PayOS] Fetching payment info for orderCode: ${orderCode}`,
      );
      return {
        status: 'PAID',
        amount: 1000000,
        orderCode,
      };
    }

    try {
      const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
        {
          method: 'GET',
          headers: {
            'x-client-id': this.clientId!,
            'x-api-key': this.apiKey!,
          },
        },
      );

      const resData = (await response.json()) as {
        code: string;
        desc: string;
        data?: {
          status: string;
          amount: number;
          orderCode: number;
        };
      };

      if (resData.code !== '00' || !resData.data) {
        return null;
      }

      return resData.data;
    } catch (err) {
      this.logger.error(
        `Failed to get PayOS payment information for ${orderCode}`,
        err,
      );
      return null;
    }
  }
}
