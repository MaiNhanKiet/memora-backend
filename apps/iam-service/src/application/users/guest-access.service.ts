import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  GUEST_ACCESS_SCOPE,
  GUEST_ACCESS_TTL_SECONDS,
  GUEST_SESSION_ABSOLUTE_TTL_SECONDS,
  GUEST_SESSION_RATE_MAX,
  GUEST_SESSION_RATE_WINDOW_SECONDS,
  GUEST_SESSION_SLIDING_TTL_SECONDS,
  RedisGuestAccessStore,
} from '../../persistence/redis/guest-access.store';
import { CustomerIdentitiesService } from './customer-identities.service';

const SESSION_TOKEN_PATTERN = /^gs_[A-Za-z0-9_-]{43}$/;
const ACCESS_TOKEN_PATTERN = /^ga_[A-Za-z0-9_-]{43}$/;
const INVALID_GUEST_CREDENTIAL = 'Invalid guest credential';

export type GuestSessionIssued = {
  guestSessionToken: string;
  expiresAt: string;
};

export type GuestSessionValidated = {
  guestSessionId: string;
  expiresAt: string;
};

export type GuestAccessIssued = {
  guestAccessToken: string;
  guestAccessExpiresInSeconds: number;
};

export type GuestAccessValidated = {
  customerIdentityId: string;
  expiresAt: string;
};

@Injectable()
export class GuestAccessService {
  constructor(
    private readonly store: RedisGuestAccessStore,
    private readonly identities: CustomerIdentitiesService,
  ) {}

  async createSession(clientIp: string): Promise<GuestSessionIssued> {
    const ipHash = sha256(clientIp.trim() === '' ? 'unknown' : clientIp.trim());
    const count = await this.store.incrementSessionRate(
      ipHash,
      GUEST_SESSION_RATE_WINDOW_SECONDS,
    );
    if (count > GUEST_SESSION_RATE_MAX) {
      throw new HttpException(
        'Please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const now = Date.now();
    const token = `gs_${randomBytes(32).toString('base64url')}`;
    await this.store.saveSession(
      sha256(token),
      {
        guestSessionId: randomUUID(),
        createdAtMs: now,
        absoluteExpiresAtMs: now + GUEST_SESSION_ABSOLUTE_TTL_SECONDS * 1000,
      },
      GUEST_SESSION_SLIDING_TTL_SECONDS,
    );
    return {
      guestSessionToken: token,
      expiresAt: new Date(
        now + GUEST_SESSION_SLIDING_TTL_SECONDS * 1000,
      ).toISOString(),
    };
  }

  async validateSession(token: string): Promise<GuestSessionValidated> {
    if (!SESSION_TOKEN_PATTERN.test(token)) {
      throw invalidCredential();
    }
    const now = Date.now();
    const session = await this.store.touchSession(
      sha256(token),
      now,
      GUEST_SESSION_SLIDING_TTL_SECONDS,
    );
    if (session === null) {
      throw invalidCredential();
    }
    const expiresAtMs = Math.min(
      now + GUEST_SESSION_SLIDING_TTL_SECONDS * 1000,
      session.absoluteExpiresAtMs,
    );
    return {
      guestSessionId: session.guestSessionId,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  async revokeSession(token: string): Promise<{ revoked: boolean }> {
    if (!SESSION_TOKEN_PATTERN.test(token)) {
      throw invalidCredential();
    }
    return { revoked: await this.store.deleteSession(sha256(token)) };
  }

  async issueAccessToken(
    customerIdentityId: string,
  ): Promise<GuestAccessIssued> {
    const token = `ga_${randomBytes(32).toString('base64url')}`;
    await this.store.saveAccess(
      sha256(token),
      {
        customerIdentityId,
        scope: GUEST_ACCESS_SCOPE,
        expiresAtMs: Date.now() + GUEST_ACCESS_TTL_SECONDS * 1000,
      },
      GUEST_ACCESS_TTL_SECONDS,
    );
    return {
      guestAccessToken: token,
      guestAccessExpiresInSeconds: GUEST_ACCESS_TTL_SECONDS,
    };
  }

  async validateAccessToken(token: string): Promise<GuestAccessValidated> {
    if (!ACCESS_TOKEN_PATTERN.test(token)) {
      throw invalidCredential();
    }
    const record = await this.store.getAccess(sha256(token));
    if (record === null || record.expiresAtMs <= Date.now()) {
      throw invalidCredential();
    }
    const identity = await this.identities.findById(record.customerIdentityId);
    if (
      identity === null ||
      identity.emailVerifiedAt === null ||
      identity.userId !== null
    ) {
      throw invalidCredential();
    }
    return {
      customerIdentityId: identity.id,
      expiresAt: new Date(record.expiresAtMs).toISOString(),
    };
  }

  revokeAccessForIdentity(customerIdentityId: string): Promise<number> {
    return this.store.deleteAccessForIdentity(customerIdentityId);
  }
}

function invalidCredential(): UnauthorizedException {
  return new UnauthorizedException(INVALID_GUEST_CREDENTIAL);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
