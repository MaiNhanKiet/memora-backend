import { Module } from '@nestjs/common';
import { RedisGoogleLinkIntentStore } from './google-link-intent.store';
import { RedisPurposeTokenStore } from './purpose-token.store';
import { RedisRefreshSessionStore } from './refresh-session.store';
import { RedisGuestAccessStore } from './guest-access.store';
import { RedisGuestIdentityStore } from './guest-identity.store';
import { RedisRegistrationOtpStore } from './registration-otp.store';
import { RedisService } from './redis.service';

@Module({
  providers: [
    RedisService,
    RedisRefreshSessionStore,
    RedisPurposeTokenStore,
    RedisRegistrationOtpStore,
    RedisGuestIdentityStore,
    RedisGuestAccessStore,
    RedisGoogleLinkIntentStore,
  ],
  exports: [
    RedisService,
    RedisRefreshSessionStore,
    RedisPurposeTokenStore,
    RedisRegistrationOtpStore,
    RedisGuestIdentityStore,
    RedisGuestAccessStore,
    RedisGoogleLinkIntentStore,
  ],
})
export class RedisModule {}
