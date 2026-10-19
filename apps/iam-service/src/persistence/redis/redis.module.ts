import { Module } from '@nestjs/common';
import { RedisGoogleLinkIntentStore } from './google-link-intent.store';
import { RedisPurposeTokenStore } from './purpose-token.store';
import { RedisRefreshSessionStore } from './refresh-session.store';
import { RedisRegistrationOtpStore } from './registration-otp.store';
import { RedisService } from './redis.service';

@Module({
  providers: [
    RedisService,
    RedisRefreshSessionStore,
    RedisPurposeTokenStore,
    RedisRegistrationOtpStore,
    RedisGoogleLinkIntentStore,
  ],
  exports: [
    RedisService,
    RedisRefreshSessionStore,
    RedisPurposeTokenStore,
    RedisRegistrationOtpStore,
    RedisGoogleLinkIntentStore,
  ],
})
export class RedisModule {}
