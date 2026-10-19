import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomInt } from 'node:crypto';
import type { User } from '../../../generated/prisma/client';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  RedisRegistrationOtpStore,
} from '../../persistence/redis/registration-otp.store';
import {
  PURPOSE_EMAIL_VERIFICATION,
  RedisPurposeTokenStore,
} from '../../persistence/redis/purpose-token.store';
import { UserRepository } from '../../repositories/user.repository';
import { AUTH_PROVIDER } from '../constants/iam-auth';
import { hasVerifiedEmail, isActiveUserStatus } from '../constants/iam-status';
import { EMAIL_SENDER, type EmailSender } from './email-sender';
import { normalizeEmail } from './identity-input';

const INVALID_CODE = 'Invalid verification code';

export type RegistrationOtpChallenge = {
  expiresInSeconds: number;
};

@Injectable()
export class EmailVerificationService {
  private readonly pepper: string;
  private readonly cooldownSeconds: number;
  private readonly rateMax: number;
  private readonly rateWindowSeconds: number;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly otps: RedisRegistrationOtpStore,
    private readonly tokens: RedisPurposeTokenStore,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    configService: ConfigService,
  ) {
    this.pepper = configService.getOrThrow<string>('iam.purposeTokenPepper');
    this.cooldownSeconds = configService.getOrThrow<number>(
      'iam.emailVerificationCooldownSeconds',
    );
    this.rateMax = configService.getOrThrow<number>('iam.emailRateLimitMax');
    this.rateWindowSeconds = configService.getOrThrow<number>(
      'iam.emailRateLimitWindowSeconds',
    );
  }

  async issue(
    userId: string,
    email: string,
  ): Promise<RegistrationOtpChallenge> {
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.otps.save(userId, hashOtp(this.pepper, otp), OTP_TTL_SECONDS);
    try {
      await this.emailSender.send({
        to: email,
        template: 'email-verification',
        code: otp,
      });
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException('Email delivery is unavailable');
    }
    return { expiresInSeconds: OTP_TTL_SECONDS };
  }

  async resend(email: string): Promise<{ alreadyVerified: boolean }> {
    const normalized = normalizeEmail(email);
    await this.enforceLimits(
      createHash('sha256').update(normalized).digest('hex'),
    );
    const user = await this.userRepository.findByEmail(normalized);
    if (user === null || user.authProvider !== AUTH_PROVIDER.LOCAL) {
      return { alreadyVerified: false };
    }
    if (hasVerifiedEmail(user.emailVerifiedAt)) {
      return { alreadyVerified: true };
    }
    if (!isActiveUserStatus(user.status) || user.passwordHash === null) {
      return { alreadyVerified: false };
    }
    await this.issue(user.id, user.email);
    return { alreadyVerified: false };
  }

  async confirm(email: string, otp: string): Promise<User> {
    const user = await this.userRepository.findByEmail(normalizeEmail(email));
    if (
      user === null ||
      user.authProvider !== AUTH_PROVIDER.LOCAL ||
      !isActiveUserStatus(user.status) ||
      user.passwordHash === null ||
      hasVerifiedEmail(user.emailVerifiedAt)
    ) {
      throw new UnauthorizedException(INVALID_CODE);
    }

    const result = await this.otps.verify(
      user.id,
      hashOtp(this.pepper, otp),
      OTP_MAX_ATTEMPTS,
    );
    if (result === 'locked') {
      throw new HttpException(
        'Too many attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (result !== 'ok') {
      throw new UnauthorizedException(INVALID_CODE);
    }

    return this.userRepository.updateById(user.id, {
      emailVerifiedAt: new Date(),
    });
  }

  private async enforceLimits(email: string): Promise<void> {
    const count = await this.tokens.incrementRate(
      PURPOSE_EMAIL_VERIFICATION,
      email,
      this.rateWindowSeconds,
    );
    if (count > this.rateMax) {
      throw new HttpException(
        'Please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const allowed = await this.tokens.acquireCooldown(
      PURPOSE_EMAIL_VERIFICATION,
      email,
      this.cooldownSeconds,
    );
    if (!allowed) {
      throw new HttpException(
        'Please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

function hashOtp(pepper: string, otp: string): string {
  return createHmac('sha256', pepper).update(otp).digest('base64url');
}
