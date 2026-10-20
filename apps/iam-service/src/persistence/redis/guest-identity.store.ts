import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from './redis.service';

export const GUEST_OTP_TTL_SECONDS = 300;
export const GUEST_OTP_MAX_ATTEMPTS = 5;
export const GUEST_RESEND_COOLDOWN_SECONDS = 60;
export const GUEST_PROOF_TTL_SECONDS = 900;
export const GUEST_LINK_SCOPE = 'link-account';

const CHALLENGE_PREFIX = 'iam:guest:challenge:';
const COOLDOWN_PREFIX = 'iam:guest:cd:';
const EMAIL_RATE_PREFIX = 'iam:guest:rl:email:';
const IP_RATE_PREFIX = 'iam:guest:rl:ip:';
const PROOF_PREFIX = 'iam:guest:proof:';
const CLAIM_STALE_MS = 5_000;

const RATE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

const CONFIRM_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'missing'
end
local record = cjson.decode(raw)
if record.phase == 'ready' then
  return 'used'
end
if record.phase == 'creating' then
  if record.identityId and record.identityId ~= '' then
    return 'resume\\n' .. record.identityId .. '\\n' .. record.contactEmail
  end
  local claimed = tonumber(record.claimedAtMs) or 0
  if tonumber(ARGV[3]) - claimed < tonumber(ARGV[4]) then
    return 'in_flight'
  end
  record.claimedAtMs = tonumber(ARGV[3])
  redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
  return 'create\\n' .. record.contactEmail
end
if record.otpHash ~= ARGV[1] then
  local attempts = tonumber(record.attempts) or 0
  attempts = attempts + 1
  if attempts >= tonumber(ARGV[2]) then
    redis.call('DEL', KEYS[1])
    return 'locked'
  end
  record.attempts = attempts
  redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
  return 'mismatch'
end
record.phase = 'creating'
record.claimedAtMs = tonumber(ARGV[3])
redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
return 'create\\n' .. record.contactEmail
`;

const ATTACH_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'missing'
end
local record = cjson.decode(raw)
if record.identityId and record.identityId ~= '' then
  if record.identityId == ARGV[1] then
    return 'ok'
  end
  return 'conflict'
end
if record.phase ~= 'creating' then
  return 'conflict'
end
record.identityId = ARGV[1]
redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
return 'ok'
`;

const READY_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'missing'
end
local record = cjson.decode(raw)
if record.identityId ~= ARGV[1] then
  return 'conflict'
end
record.phase = 'ready'
redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
return 'ok'
`;

const CONSUME_PROOF_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 'missing'
end
local record = cjson.decode(raw)
if record.phase == 'used' then
  return 'used'
end
if record.scope ~= ARGV[1] or record.customerIdentityId ~= ARGV[2] then
  return 'mismatch'
end
record.phase = 'used'
redis.call('SET', KEYS[1], cjson.encode(record), 'KEEPTTL')
return 'ok'
`;

export type GuestConfirmClaim =
  | { status: 'create'; contactEmail: string }
  | { status: 'resume'; identityId: string; contactEmail: string }
  | { status: 'in_flight' }
  | { status: 'used' }
  | { status: 'mismatch' }
  | { status: 'locked' }
  | { status: 'missing' };

export type GuestProofPeek =
  | { status: 'active'; customerIdentityId: string }
  | { status: 'used' }
  | { status: 'missing' };

type ChallengeRecord = {
  contactEmail: string;
  otpHash: string;
  attempts: number;
  phase: 'open' | 'creating' | 'ready';
  identityId: string;
  claimedAtMs: number | null;
};

@Injectable()
export class RedisGuestIdentityStore {
  constructor(private readonly redis: RedisService) {}

  async incrementRate(
    emailHash: string,
    ipHash: string,
    windowSeconds: number,
  ): Promise<{ emailCount: number; ipCount: number }> {
    try {
      const client = this.redis.getClient();
      const emailCount = await client.eval(
        RATE_SCRIPT,
        1,
        `${EMAIL_RATE_PREFIX}${emailHash}`,
        String(windowSeconds),
      );
      const ipCount = await client.eval(
        RATE_SCRIPT,
        1,
        `${IP_RATE_PREFIX}${ipHash}`,
        String(windowSeconds),
      );
      return { emailCount: asCount(emailCount), ipCount: asCount(ipCount) };
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async acquireCooldown(
    emailHash: string,
    cooldownSeconds: number,
  ): Promise<boolean> {
    try {
      const result = await this.redis
        .getClient()
        .set(
          `${COOLDOWN_PREFIX}${emailHash}`,
          '1',
          'EX',
          cooldownSeconds,
          'NX',
        );
      return result === 'OK';
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async saveChallenge(
    challengeId: string,
    contactEmail: string,
    otpHash: string,
    ttlSeconds: number,
  ): Promise<void> {
    const record: ChallengeRecord = {
      contactEmail,
      otpHash,
      attempts: 0,
      phase: 'open',
      identityId: '',
      claimedAtMs: null,
    };
    try {
      await this.redis
        .getClient()
        .set(
          `${CHALLENGE_PREFIX}${challengeId}`,
          JSON.stringify(record),
          'EX',
          ttlSeconds,
        );
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async discardChallenge(
    challengeId: string,
    emailHash: string,
  ): Promise<void> {
    try {
      await this.redis
        .getClient()
        .del(
          `${CHALLENGE_PREFIX}${challengeId}`,
          `${COOLDOWN_PREFIX}${emailHash}`,
        );
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async claimChallenge(
    challengeId: string,
    otpHash: string,
    maxAttempts: number,
  ): Promise<GuestConfirmClaim> {
    try {
      const result = await this.redis
        .getClient()
        .eval(
          CONFIRM_SCRIPT,
          1,
          `${CHALLENGE_PREFIX}${challengeId}`,
          otpHash,
          String(maxAttempts),
          String(Date.now()),
          String(CLAIM_STALE_MS),
        );
      return parseClaim(result);
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async attachIdentity(
    challengeId: string,
    identityId: string,
  ): Promise<'ok' | 'conflict' | 'missing'> {
    try {
      const result = await this.redis
        .getClient()
        .eval(
          ATTACH_SCRIPT,
          1,
          `${CHALLENGE_PREFIX}${challengeId}`,
          identityId,
        );
      if (result === 'ok' || result === 'conflict' || result === 'missing') {
        return result;
      }
      return 'missing';
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async markReady(challengeId: string, identityId: string): Promise<void> {
    try {
      await this.redis
        .getClient()
        .eval(READY_SCRIPT, 1, `${CHALLENGE_PREFIX}${challengeId}`, identityId);
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async saveProof(
    proofHash: string,
    customerIdentityId: string,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.redis.getClient().set(
        `${PROOF_PREFIX}${proofHash}`,
        JSON.stringify({
          customerIdentityId,
          scope: GUEST_LINK_SCOPE,
          phase: 'active',
        }),
        'EX',
        ttlSeconds,
      );
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async peekProof(proofHash: string): Promise<GuestProofPeek> {
    try {
      const raw = await this.redis
        .getClient()
        .get(`${PROOF_PREFIX}${proofHash}`);
      if (raw === null) {
        return { status: 'missing' };
      }
      const record = JSON.parse(raw) as {
        customerIdentityId?: string;
        scope?: string;
        phase?: string;
      };
      if (
        record.scope !== GUEST_LINK_SCOPE ||
        record.customerIdentityId === undefined ||
        record.customerIdentityId.length === 0
      ) {
        return { status: 'missing' };
      }
      if (record.phase === 'used') {
        return { status: 'used' };
      }
      return {
        status: 'active',
        customerIdentityId: record.customerIdentityId,
      };
    } catch (error) {
      throwUnavailable(error);
    }
  }

  async consumeProof(
    proofHash: string,
    customerIdentityId: string,
  ): Promise<'ok' | 'used' | 'missing' | 'mismatch'> {
    try {
      const result = await this.redis
        .getClient()
        .eval(
          CONSUME_PROOF_SCRIPT,
          1,
          `${PROOF_PREFIX}${proofHash}`,
          GUEST_LINK_SCOPE,
          customerIdentityId,
        );
      if (
        result === 'ok' ||
        result === 'used' ||
        result === 'missing' ||
        result === 'mismatch'
      ) {
        return result;
      }
      return 'missing';
    } catch (error) {
      throwUnavailable(error);
    }
  }
}

function parseClaim(result: unknown): GuestConfirmClaim {
  const value = typeof result === 'string' ? result : '';
  if (value === 'missing' || value === 'used' || value === 'mismatch') {
    return { status: value };
  }
  if (value === 'locked' || value === 'in_flight') {
    return { status: value };
  }
  if (value.startsWith('create\n')) {
    return { status: 'create', contactEmail: value.slice('create\n'.length) };
  }
  if (value.startsWith('resume\n')) {
    const parts = value.split('\n');
    const identityId = parts[1] ?? '';
    const contactEmail = parts.slice(2).join('\n');
    if (identityId.length === 0 || contactEmail.length === 0) {
      return { status: 'missing' };
    }
    return { status: 'resume', identityId, contactEmail };
  }
  return { status: 'missing' };
}

function asCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}

function throwUnavailable(error: unknown): never {
  if (error instanceof ServiceUnavailableException) {
    throw error;
  }
  throw new ServiceUnavailableException('Session store unavailable');
}
