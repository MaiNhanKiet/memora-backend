import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from 'node:crypto';
import {
  Prisma,
  type CustomerIdentity,
} from '../../../generated/prisma/client';
import {
  GUEST_OTP_MAX_ATTEMPTS,
  GUEST_OTP_TTL_SECONDS,
  GUEST_PROOF_TTL_SECONDS,
  GUEST_RESEND_COOLDOWN_SECONDS,
  RedisGuestIdentityStore,
} from '../../persistence/redis/guest-identity.store';
import { AuthenticationService } from '../auth/authentication.service';
import {
  EMAIL_SENDER,
  emailDeliveryUnavailable,
  type EmailSender,
} from '../auth/email-sender';
import { normalizeEmail } from '../auth/identity-input';
import { SECURITY_AUDIT_ACTION } from '../auth/security-audit';
import { SecurityAuditService } from '../auth/security-audit.service';
import { CustomerIdentitiesService } from './customer-identities.service';

const INVALID_CODE = 'Invalid verification code';
const INVALID_PROOF = 'Invalid guest proof';

export type GuestVerificationChallenge = {
  challengeId: string;
  expiresInSeconds: number;
};

export type GuestVerificationProof = {
  customerIdentityId: string;
  guestProof: string;
  expiresInSeconds: number;
};

export type LinkedGuestIdentity = {
  customerIdentityId: string;
  userId: string;
  isPrimaryForUser: true;
  accountLinkedAt: string;
};

@Injectable()
export class GuestIdentityService {
  private readonly logger = new Logger(GuestIdentityService.name);
  private readonly pepper: string;
  private readonly rateMax: number;
  private readonly rateWindowSeconds: number;

  constructor(
    private readonly store: RedisGuestIdentityStore,
    private readonly identities: CustomerIdentitiesService,
    private readonly authentication: AuthenticationService,
    private readonly securityAudit: SecurityAuditService,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    configService: ConfigService,
  ) {
    this.pepper = configService.getOrThrow<string>('iam.purposeTokenPepper');
    this.rateMax = configService.getOrThrow<number>('iam.emailRateLimitMax');
    this.rateWindowSeconds = configService.getOrThrow<number>(
      'iam.emailRateLimitWindowSeconds',
    );
  }

  async requestVerification(
    contactEmail: string,
    clientIp: string,
  ): Promise<GuestVerificationChallenge> {
    const email = normalizeEmail(contactEmail);
    const emailHash = sha256(email);
    const ipHash = sha256(clientIp.trim() === '' ? 'unknown' : clientIp.trim());
    const rate = await this.store.incrementRate(
      emailHash,
      ipHash,
      this.rateWindowSeconds,
    );
    if (rate.emailCount > this.rateMax || rate.ipCount > this.rateMax) {
      throw later();
    }
    const cooled = await this.store.acquireCooldown(
      emailHash,
      GUEST_RESEND_COOLDOWN_SECONDS,
    );
    if (!cooled) {
      throw later();
    }

    const challengeId = randomBytes(32).toString('base64url');
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.store.saveChallenge(
      challengeId,
      email,
      hashSecret(this.pepper, otp),
      GUEST_OTP_TTL_SECONDS,
    );
    try {
      await this.emailSender.send({
        to: email,
        template: 'guest-identity-verification',
        code: otp,
      });
    } catch (error) {
      await this.store.discardChallenge(challengeId, emailHash).catch(() => {
        this.logger.error('Guest challenge rollback failed');
      });
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw emailDeliveryUnavailable();
    }
    return {
      challengeId,
      expiresInSeconds: GUEST_OTP_TTL_SECONDS,
    };
  }

  async confirmVerification(
    challengeId: string,
    otp: string,
  ): Promise<GuestVerificationProof> {
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException(INVALID_CODE);
    }
    const claim = await this.store.claimChallenge(
      challengeId,
      hashSecret(this.pepper, otp),
      GUEST_OTP_MAX_ATTEMPTS,
    );
    if (claim.status === 'locked') {
      throw new HttpException(
        'Too many attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (claim.status === 'in_flight') {
      throw new ServiceUnavailableException(
        'Guest verification is unavailable',
      );
    }
    if (claim.status === 'create') {
      return this.finishChallenge(challengeId, claim.contactEmail);
    }
    if (claim.status === 'resume') {
      return this.finishExisting(
        challengeId,
        claim.identityId,
        claim.contactEmail,
      );
    }
    throw new BadRequestException(INVALID_CODE);
  }

  async getPrimary(accessCredential: string): Promise<CustomerIdentity | null> {
    const principal =
      await this.authentication.verifyAccessToken(accessCredential);
    return this.identities.findPrimaryByUserId(principal.user.id);
  }

  async linkToMyAccount(
    accessCredential: string,
    guestProof: string,
  ): Promise<LinkedGuestIdentity> {
    const principal =
      await this.authentication.verifyAccessToken(accessCredential);
    const proof = await this.store.peekProof(
      hashSecret(this.pepper, guestProof),
    );
    if (proof.status !== 'active') {
      throw new BadRequestException(INVALID_PROOF);
    }
    const linked = await this.identities.linkVerifiedGuestAsPrimary(
      proof.customerIdentityId,
      principal.user.id,
      (tx) =>
        this.securityAudit
          .record(
            {
              userId: principal.user.id,
              action: SECURITY_AUDIT_ACTION.GUEST_IDENTITY_LINKED,
              metadata: { customerIdentityId: proof.customerIdentityId },
            },
            tx,
          )
          .then(() => undefined),
    );
    if (linked.kind === 'linked') {
      await this.store.consumeProof(
        hashSecret(this.pepper, guestProof),
        proof.customerIdentityId,
      );
      return toLinked(linked.identity, principal.user.id);
    }
    if (linked.kind === 'unverified') {
      throw new ForbiddenException('Guest identity is not verified');
    }
    if (linked.kind === 'missing') {
      throw new NotFoundException('Customer identity not found');
    }
    if (linked.kind === 'primary_conflict') {
      throw new ConflictException('User already has a primary identity');
    }
    throw new ConflictException('Guest identity is already linked');
  }

  private async finishChallenge(
    challengeId: string,
    contactEmail: string,
  ): Promise<GuestVerificationProof> {
    const identityId = randomUUID();
    const attached = await this.store.attachIdentity(challengeId, identityId);
    if (attached === 'conflict') {
      throw new ServiceUnavailableException(
        'Guest verification is unavailable',
      );
    }
    if (attached === 'missing') {
      throw new BadRequestException(INVALID_CODE);
    }
    return this.finishExisting(challengeId, identityId, contactEmail);
  }

  private async finishExisting(
    challengeId: string,
    identityId: string,
    contactEmail: string,
  ): Promise<GuestVerificationProof> {
    const existing = await this.identities.findById(identityId);
    if (
      existing !== null &&
      existing.contactEmail.toLowerCase() !== contactEmail.toLowerCase()
    ) {
      throw new BadRequestException(INVALID_CODE);
    }
    const identity =
      existing ?? (await this.createGuest(identityId, contactEmail));
    if (identity.userId !== null || identity.emailVerifiedAt === null) {
      throw new BadRequestException(INVALID_CODE);
    }
    const guestProof = randomBytes(32).toString('base64url');
    await this.store.saveProof(
      hashSecret(this.pepper, guestProof),
      identity.id,
      GUEST_PROOF_TTL_SECONDS,
    );
    await this.store.markReady(challengeId, identity.id).catch(() => {
      this.logger.error('Guest challenge finalize failed');
    });
    return {
      customerIdentityId: identity.id,
      guestProof,
      expiresInSeconds: GUEST_PROOF_TTL_SECONDS,
    };
  }

  private async createGuest(
    identityId: string,
    contactEmail: string,
  ): Promise<CustomerIdentity> {
    try {
      return await this.identities.createVerifiedGuest({
        id: identityId,
        contactEmail,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const created = await this.identities.findById(identityId);
        if (
          created !== null &&
          created.contactEmail.toLowerCase() === contactEmail.toLowerCase()
        ) {
          return created;
        }
      }
      throw error;
    }
  }
}

function toLinked(
  identity: CustomerIdentity,
  userId: string,
): LinkedGuestIdentity {
  if (identity.accountLinkedAt === null || identity.isPrimaryForUser !== true) {
    throw new ConflictException('Guest identity is already linked');
  }
  return {
    customerIdentityId: identity.id,
    userId,
    isPrimaryForUser: true,
    accountLinkedAt: identity.accountLinkedAt.toISOString(),
  };
}

function hashSecret(pepper: string, value: string): string {
  return createHmac('sha256', pepper).update(value).digest('base64url');
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function later(): HttpException {
  return new HttpException(
    'Please try again later',
    HttpStatus.TOO_MANY_REQUESTS,
  );
}
