import { ServiceUnavailableException } from '@nestjs/common';

export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export const VERIFICATION_TEMPLATE_VARIABLE = 'OTP';
export const RESET_TEMPLATE_VARIABLE = 'RESET_LINK';

export type OutboundEmail =
  | {
      to: string;
      template: 'email-verification';
      code: string;
    }
  | {
      to: string;
      template: 'password-reset';
      actionUrl: string;
    }
  | {
      to: string;
      template: 'security-notice';
      subject: string;
      text: string;
    }
  | {
      to: string;
      template: 'guest-identity-verification';
      code: string;
    };

export interface EmailSender {
  send(message: OutboundEmail): Promise<void>;
}

export function emailDeliveryUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('Email delivery is unavailable');
}
