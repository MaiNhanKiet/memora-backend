import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;

export type RegistrationOtpVerifyResult =
  'ok' | 'mismatch' | 'locked' | 'missing';

const KEY_PREFIX = 'iam:otp:register:';

const VERIFY_SCRIPT = `
local key = KEYS[1]
local expected = ARGV[1]
local maxAttempts = tonumber(ARGV[2])
local raw = redis.call('GET', key)
if not raw then
  return 'missing'
end
local record = cjson.decode(raw)
if record.hash ~= expected then
  local attempts = tonumber(record.attempts) or 0
  attempts = attempts + 1
  if attempts >= maxAttempts then
    redis.call('DEL', key)
    return 'locked'
  end
  record.attempts = attempts
  redis.call('SET', key, cjson.encode(record), 'KEEPTTL')
  return 'mismatch'
end
redis.call('DEL', key)
return 'ok'
`;

@Injectable()
export class RedisRegistrationOtpStore {
  constructor(private readonly redis: RedisService) {}

  async save(
    userId: string,
    otpHash: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(
          keyOf(userId),
          JSON.stringify({ hash: otpHash, attempts: 0 }),
          'EX',
          ttlSeconds,
        );
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async verify(
    userId: string,
    otpHash: string,
    maxAttempts: number,
  ): Promise<RegistrationOtpVerifyResult> {
    try {
      const result = await this.redis
        .getClient()
        .eval(VERIFY_SCRIPT, 1, keyOf(userId), otpHash, String(maxAttempts));
      if (
        result === 'ok' ||
        result === 'mismatch' ||
        result === 'locked' ||
        result === 'missing'
      ) {
        return result;
      }
      return 'missing';
    } catch (error) {
      throwUnavailable(error);
    }
  }
}

function keyOf(userId: string): string {
  return `${KEY_PREFIX}${userId}`;
}

function throwUnavailable(error: unknown): never {
  if (error instanceof ServiceUnavailableException) {
    throw error;
  }
  throw new ServiceUnavailableException('Session store unavailable');
}
