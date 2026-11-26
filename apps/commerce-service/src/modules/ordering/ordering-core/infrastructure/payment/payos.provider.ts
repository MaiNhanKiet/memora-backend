import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  PayosCreatePaymentLinkParams,
  PayosGateway,
  PayosPaymentInfo,
  PayosPaymentLinkData,
  PayosWebhookPayload,
} from '../../application/payos.gateway';

interface PayosCredentials {
  readonly clientId: string;
  readonly apiKey: string;
  readonly checksumKey: string;
}

@Injectable()
export class PayosProvider implements PayosGateway {
  private readonly logger = new Logger(PayosProvider.name);
  private readonly credentials?: PayosCredentials;

  constructor(configService: ConfigService) {
    this.credentials = configService.get<PayosCredentials>('commerce.payos');
    if (!this.credentials) {
      this.logger.warn(
        'PayOS is unavailable because credentials are incomplete',
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
    const credentials = this.requireCredentials();

    // Call live PayOS API using native fetch
    try {
      const description = (
        params.description || `MEMORA ${params.orderCode}`
      ).slice(0, 25);
      const signatureData = `amount=${params.amount}&cancelUrl=${params.cancelUrl}&description=${description}&orderCode=${params.orderCode}&returnUrl=${params.returnUrl}`;
      const signature = crypto
        .createHmac('sha256', credentials.checksumKey)
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
            'x-client-id': credentials.clientId,
            'x-api-key': credentials.apiKey,
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
        throw new Error('PayOS rejected the payment link request');
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
    const credentials = this.requireCredentials();

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
    const signString = Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${formatValue(v)}`)
      .join('&');

    const expectedSignature = crypto
      .createHmac('sha256', credentials.checksumKey)
      .update(signString)
      .digest('hex');

    return signature === expectedSignature;
  }

  async getPaymentInformation(
    orderCode: number,
  ): Promise<PayosPaymentInfo | null> {
    const credentials = this.requireCredentials();

    try {
      const response = await fetch(
        `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`,
        {
          method: 'GET',
          headers: {
            'x-client-id': credentials.clientId,
            'x-api-key': credentials.apiKey,
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

  private requireCredentials(): PayosCredentials {
    if (!this.credentials) {
      throw new ServiceUnavailableException('PayOS is not configured');
    }
    return this.credentials;
  }
}
