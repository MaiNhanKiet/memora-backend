import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  RESET_TEMPLATE_VARIABLE,
  VERIFICATION_TEMPLATE_VARIABLE,
  emailDeliveryUnavailable,
  type EmailSender,
  type OutboundEmail,
} from './email-sender';

type ResendSendResult = {
  error: { name: string } | null;
};

const VERIFICATION_SUBJECT = 'MEMORA - Xác thực tài khoản';
const RESET_SUBJECT = 'MEMORA - Yêu cầu đặt lại mật khẩu';

export type ResendEmailClient = {
  send: (payload: {
    from: string;
    to: string[];
    subject?: string;
    text?: string;
    template?: {
      id: string;
      variables: Record<string, string>;
    };
  }) => Promise<ResendSendResult>;
};

@Injectable()
export class ResendEmailSender implements EmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly from: string;
  private readonly verifyTemplateId: string;
  private readonly resetTemplateId: string;
  private readonly client: ResendEmailClient;

  constructor(
    configService: ConfigService,
    @Optional() client?: ResendEmailClient,
  ) {
    this.from = configService.getOrThrow<string>('iam.emailFrom');
    this.verifyTemplateId = configService.getOrThrow<string>(
      'iam.resendTemplateVerify',
    );
    this.resetTemplateId = configService.getOrThrow<string>(
      'iam.resendTemplateReset',
    );
    this.client =
      client ??
      createResendClient(configService.getOrThrow<string>('iam.resendApiKey'));
  }

  async send(message: OutboundEmail): Promise<void> {
    const payload = this.toPayload(message);
    let result: ResendSendResult;
    try {
      result = await this.client.send(payload);
    } catch {
      this.logger.error('Resend request failed');
      throw emailDeliveryUnavailable();
    }

    if (result.error !== null) {
      this.logger.error(`Resend rejected the email: ${result.error.name}`);
      throw emailDeliveryUnavailable();
    }
  }

  private toPayload(
    message: OutboundEmail,
  ): Parameters<ResendEmailClient['send']>[0] {
    if (message.template === 'guest-identity-verification') {
      return {
        from: this.from,
        to: [message.to],
        subject: 'MEMORA - Xác minh email khách',
        text: `Mã xác minh MEMORA của bạn là ${message.code}. Mã hết hạn sau 5 phút.`,
      };
    }

    if (message.template === 'security-notice') {
      return {
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      };
    }

    if (message.template === 'email-verification') {
      return {
        from: this.from,
        to: [message.to],
        subject: VERIFICATION_SUBJECT,
        template: {
          id: this.verifyTemplateId,
          variables: {
            [VERIFICATION_TEMPLATE_VARIABLE]: message.code,
          },
        },
      };
    }

    return {
      from: this.from,
      to: [message.to],
      subject: RESET_SUBJECT,
      template: {
        id: this.resetTemplateId,
        variables: {
          [RESET_TEMPLATE_VARIABLE]: message.actionUrl,
        },
      },
    };
  }
}

function createResendClient(apiKey: string): ResendEmailClient {
  const resend = new Resend(apiKey);
  return {
    send: (payload) => {
      if (payload.template === undefined) {
        return resend.emails.send({
          from: payload.from,
          to: payload.to,
          subject: payload.subject ?? 'MEMORA',
          text: payload.text ?? '',
        });
      }
      return resend.emails.send({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        template: payload.template,
      });
    },
  };
}
