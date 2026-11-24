import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';

export const GUEST_SESSION_SLIDING_TTL_SECONDS = 7 * 24 * 60 * 60;
export const GUEST_SESSION_ABSOLUTE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const GUEST_ACCESS_TTL_SECONDS = 24 * 60 * 60;
export const GUEST_SESSION_RATE_MAX = 20;
export const GUEST_SESSION_RATE_WINDOW_SECONDS = 60 * 60;
export const GUEST_ACCESS_SCOPE = 'guest-order';

const SESSION_PREFIX = 'iam:guest:session:';
const ACCESS_PREFIX = 'iam:guest:access:';
const ACCESS_BY_IDENTITY_PREFIX = 'iam:guest:access:by-identity:';
const SESSION_IP_RATE_PREFIX = 'iam:guest:rl:session-ip:';

const RATE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

const TOUCH_SESSION_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return false
end
local record = cjson.decode(raw)
local now = tonumber(ARGV[1])
local remainingMs = tonumber(record.absoluteExpiresAtMs) - now
if remainingMs <= 0 then
  redis.call('DEL', KEYS[1])
  return false
end
local ttl = tonumber(ARGV[2])
local remainingSeconds = math.ceil(remainingMs / 1000)
if remainingSeconds < ttl then
  ttl = remainingSeconds
end
redis.call('EXPIRE', KEYS[1], ttl)
return raw
`;

export type GuestSessionRecord = {
  guestSessionId: string;
  createdAtMs: number;
  absoluteExpiresAtMs: number;
};

export type GuestAccessRecord = {
  customerIdentityId: string;
  scope: typeof GUEST_ACCESS_SCOPE;
  expiresAtMs: number;
};

@Injectable()
export class RedisGuestAccessStore {
  constructor(private readonly redis: RedisService) {}

  async incrementSessionRate(
    ipHash: string,
    windowSeconds: number,
  ): Promise<number> {
    try {
      const count = await this.redis
        .getClient()
        .eval(
          RATE_SCRIPT,
          1,
          `${SESSION_IP_RATE_PREFIX}${ipHash}`,
          String(windowSeconds),
        );
      const parsed = Number(count);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async saveSession(
    tokenHash: string,
    record: GuestSessionRecord,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis
        .getClient()
        .set(
          `${SESSION_PREFIX}${tokenHash}`,
          JSON.stringify(record),
          'EX',
          ttlSeconds,
        );
    } catch (error) {
      throwUnavailable(error);
    }
  }

  /** Returns the session and extends its TTL, never past the absolute expiry. */
  async touchSession(
    tokenHash: string,
    nowMs: number,
    slidingSeconds: number,
  ): Promise<GuestSessionRecord | null> {
    try {
      const raw = await this.redis
        .getClient()
        .eval(
          TOUCH_SESSION_SCRIPT,
          1,
          `${SESSION_PREFIX}${tokenHash}`,
          String(nowMs),
          String(slidingSeconds),
        );
      return typeof raw === 'string' ? parseSession(raw) : null;
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async deleteSession(tokenHash: string): Promise<boolean> {
    try {
      const removed = await this.redis
        .getClient()
        .del(`${SESSION_PREFIX}${tokenHash}`);
      return removed > 0;
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async saveAccess(
    tokenHash: string,
    record: GuestAccessRecord,
    ttlSeconds: number,
  ): Promise<void> {
    const indexKey = `${ACCESS_BY_IDENTITY_PREFIX}${record.customerIdentityId}`;
    try {
      await this.redis
        .getClient()
        .multi()
        .set(
          `${ACCESS_PREFIX}${tokenHash}`,
          JSON.stringify(record),
          'EX',
          ttlSeconds,
        )
        .sadd(indexKey, tokenHash)
        .expire(indexKey, ttlSeconds)
        .exec();
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async getAccess(tokenHash: string): Promise<GuestAccessRecord | null> {
    try {
      const raw = await this.redis
        .getClient()
        .get(`${ACCESS_PREFIX}${tokenHash}`);
      return raw === null ? null : parseAccess(raw);
    } catch (error) {
      throwUnavailable(error);
    }
  }

  /** Deletes every guest access token indexed for the identity (D-G-07). */
  async deleteAccessForIdentity(customerIdentityId: string): Promise<number> {
    const indexKey = `${ACCESS_BY_IDENTITY_PREFIX}${customerIdentityId}`;
    try {
      const client = this.redis.getClient();
      const hashes = await client.smembers(indexKey);
      const keys = hashes.map((hash) => `${ACCESS_PREFIX}${hash}`);
      await client.del(...keys, indexKey);
      return hashes.length;
    } catch (error) {
      throwUnavailable(error);
    }
  }
}

function parseSession(raw: string): GuestSessionRecord | null {
  try {
    const value = JSON.parse(raw) as Partial<GuestSessionRecord>;
    if (
      typeof value.guestSessionId !== 'string' ||
      typeof value.createdAtMs !== 'number' ||
      typeof value.absoluteExpiresAtMs !== 'number'
    ) {
      return null;
    }
    return {
      guestSessionId: value.guestSessionId,
      createdAtMs: value.createdAtMs,
      absoluteExpiresAtMs: value.absoluteExpiresAtMs,
    };
  } catch {
    return null;
  }
}

function parseAccess(raw: string): GuestAccessRecord | null {
  try {
    const value = JSON.parse(raw) as Partial<GuestAccessRecord>;
    if (
      typeof value.customerIdentityId !== 'string' ||
      value.scope !== GUEST_ACCESS_SCOPE ||
      typeof value.expiresAtMs !== 'number'
    ) {
      return null;
    }
    return {
      customerIdentityId: value.customerIdentityId,
      scope: GUEST_ACCESS_SCOPE,
      expiresAtMs: value.expiresAtMs,
    };
  } catch {
    return null;
  }
}

function throwUnavailable(error: unknown): never {
  if (error instanceof ServiceUnavailableException) {
    throw error;
  }
  throw new ServiceUnavailableException('Session store unavailable');
}
