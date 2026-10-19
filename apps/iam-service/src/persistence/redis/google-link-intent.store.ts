import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';

export const GOOGLE_LINK_TTL_SECONDS = 300;

const INTENT_PREFIX = 'iam:google-link:intent:';
const CONFIRM_PREFIX = 'iam:google-link:confirm:';

export type GoogleLinkConfirmation = {
  userId: string;
  googleSub: string;
  googleEmail: string;
};

@Injectable()
export class RedisGoogleLinkIntentStore {
  constructor(private readonly redis: RedisService) {}

  async saveIntent(intentId: string, userId: string): Promise<void> {
    await this.set(INTENT_PREFIX + intentId, JSON.stringify({ userId }));
  }

  consumeIntent(intentId: string): Promise<string | null> {
    return this.consume(INTENT_PREFIX + intentId, readUserId);
  }

  async saveConfirmation(
    confirmationId: string,
    confirmation: GoogleLinkConfirmation,
  ): Promise<void> {
    await this.set(
      CONFIRM_PREFIX + confirmationId,
      JSON.stringify(confirmation),
    );
  }

  readConfirmation(
    confirmationId: string,
  ): Promise<GoogleLinkConfirmation | null> {
    return this.read(CONFIRM_PREFIX + confirmationId, readConfirmation);
  }

  consumeConfirmation(
    confirmationId: string,
  ): Promise<GoogleLinkConfirmation | null> {
    return this.consume(CONFIRM_PREFIX + confirmationId, readConfirmation);
  }

  private async set(key: string, value: string): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(key, value, 'EX', GOOGLE_LINK_TTL_SECONDS);
    } catch (error) {
      throwUnavailable(error);
    }
  }

  private async read<T>(
    key: string,
    parse: (value: unknown) => T | null,
  ): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(key);
      if (raw === null) {
        return null;
      }
      return parse(JSON.parse(raw));
    } catch (error) {
      throwUnavailable(error);
    }
  }

  private async consume<T>(
    key: string,
    read: (value: unknown) => T | null,
  ): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().getdel(key);
      if (raw === null) {
        return null;
      }
      return read(JSON.parse(raw));
    } catch (error) {
      throwUnavailable(error);
    }
  }
}

function readUserId(value: unknown): string | null {
  if (
    !isRecord(value) ||
    typeof value.userId !== 'string' ||
    value.userId.length === 0
  ) {
    return null;
  }
  return value.userId;
}

function readConfirmation(value: unknown): GoogleLinkConfirmation | null {
  if (
    !isRecord(value) ||
    typeof value.userId !== 'string' ||
    value.userId.length === 0 ||
    typeof value.googleSub !== 'string' ||
    value.googleSub.length === 0 ||
    typeof value.googleEmail !== 'string' ||
    value.googleEmail.length === 0
  ) {
    return null;
  }
  return {
    userId: value.userId,
    googleSub: value.googleSub,
    googleEmail: value.googleEmail,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function throwUnavailable(error: unknown): never {
  if (error instanceof ServiceUnavailableException) {
    throw error;
  }
  throw new ServiceUnavailableException('Session store unavailable');
}
