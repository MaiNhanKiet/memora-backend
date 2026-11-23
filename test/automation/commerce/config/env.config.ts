import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

loadDotenv({
  path: resolve(__dirname, '../../../../.env'),
  override: false,
  quiet: true,
});

export interface CommerceTestConfig {
  baseUrl: string;
  payosWebhookUrl: string;
  timeoutMs: number;
}

export const testConfig: CommerceTestConfig = {
  baseUrl: process.env.API_GATEWAY_URL || `http://localhost:${process.env.API_GATEWAY_PORT || 3000}`,
  payosWebhookUrl: process.env.PAYOS_WEBHOOK_URL || 'https://api.memora.vn/api/v1/payments/payos/webhook',
  timeoutMs: 30000,
};
