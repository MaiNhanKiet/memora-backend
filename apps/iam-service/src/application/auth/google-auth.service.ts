import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, type User } from '../../../generated/prisma/client';
import { RedisGoogleLinkIntentStore } from '../../persistence/redis/google-link-intent.store';
import { RoleRepository } from '../../repositories/role.repository';
import { UserRepository } from '../../repositories/user.repository';
import { AUTH_PROVIDER, ROLE_CODE } from '../constants/iam-auth';
import { isActiveUserStatus, USER_STATUS } from '../constants/iam-status';
import { toPublicUser, type PublicUser } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import { AccessTokenService } from './access-token.service';
import type { AuthSession } from './authentication.service';
import { EMAIL_SENDER, type EmailSender } from './email-sender';
import { PasswordHasher } from './password-hasher';
import {
  GoogleIdTokenVerifier,
  type VerifiedGoogleIdentity,
} from './google-id-token.verifier';
import {
  RefreshTokenService,
  type IssuedRefreshSession,
} from './refresh-token.service';
import { SECURITY_AUDIT_ACTION } from './security-audit';
import { SecurityAuditService } from './security-audit.service';

const EMAIL_ALREADY_REGISTERED =
  'This email is already registered. Sign in with your existing account.';
const UNABLE_TO_SIGN_IN = 'Unable to sign in';

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  constructor(
    private readonly tokens: GoogleIdTokenVerifier,
    private readonly users: UsersService,
    private readonly userRepository: UserRepository,
    private readonly roles: RoleRepository,
    private readonly accessTokens: AccessTokenService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly passwords: PasswordHasher,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
    private readonly linkIntents: RedisGoogleLinkIntentStore,
    private readonly securityAudit: SecurityAuditService,
  ) {}

  async authenticate(idToken: string): Promise<AuthSession> {
    const identity = await this.tokens.verify(idToken);
    const existing = await this.userRepository.findByGoogleSub(
      identity.googleSub,
    );
    if (existing !== null) {
      return this.signInExisting(existing);
    }
    return this.registerGoogleCustomer(identity);
  }

  async startGoogleLink(userId: string, password: string): Promise<string> {
    const user = await this.requirePasswordAccount(userId);
    await this.assertCurrentPassword(user, password);
    const intentId = randomBytes(32).toString('base64url');
    await this.linkIntents.saveIntent(intentId, user.id);
    return intentId;
  }

  async completeGoogleLink(
    intentId: string,
    idToken: string,
  ): Promise<
    | { confirmationRequired: false; user: User }
    | { confirmationRequired: true; confirmationId: string }
  > {
    const userId = await this.linkIntents.consumeIntent(intentId);
    if (userId === null) {
      throw new UnauthorizedException('Google sign-in state is invalid');
    }
    const user = await this.requirePasswordAccount(userId);
    const identity = await this.tokens.verify(idToken);
    await this.assertGoogleAvailable(user, identity);
    const emailDiffers =
      normalizeEmail(identity.email) !== normalizeEmail(user.email);
    if (emailDiffers) {
      const confirmationId = randomBytes(32).toString('base64url');
      await this.linkIntents.saveConfirmation(confirmationId, {
        userId: user.id,
        googleSub: identity.googleSub,
        googleEmail: normalizeEmail(identity.email),
      });
      return { confirmationRequired: true, confirmationId };
    }
    if (user.googleSub === identity.googleSub) {
      return { confirmationRequired: false, user };
    }
    return {
      confirmationRequired: false,
      user: await this.linkVerifiedGoogle(user, identity.googleSub, false),
    };
  }

  async confirmGoogleLink(
    userId: string,
    confirmationId: string,
  ): Promise<User> {
    const confirmation =
      await this.linkIntents.readConfirmation(confirmationId);
    if (confirmation === null || confirmation.userId !== userId) {
      throw new UnauthorizedException('Google sign-in state is invalid');
    }
    const user = await this.requirePasswordAccount(userId);
    const owner = await this.userRepository.findByGoogleSub(
      confirmation.googleSub,
    );
    if (owner !== null && owner.id !== user.id) {
      throw new ConflictException('This Google account is already linked');
    }
    const emailOwner = await this.users.findAuthByEmail(
      confirmation.googleEmail,
    );
    if (emailOwner !== null && emailOwner.id !== user.id) {
      throw new ConflictException('This Google email is already registered');
    }
    if (user.googleSub === confirmation.googleSub) {
      await this.linkIntents.consumeConfirmation(confirmationId);
      return user;
    }
    if (user.googleSub !== null) {
      throw new ConflictException('This account is already linked to Google');
    }
    const linked = await this.linkVerifiedGoogle(
      user,
      confirmation.googleSub,
      true,
    );
    await this.linkIntents.consumeConfirmation(confirmationId);
    return linked;
  }

  async unlinkAccount(userId: string, password: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (user === null || !isActiveUserStatus(user.status)) {
      throw new BadRequestException('Google linking is unavailable');
    }
    if (user.passwordHash === null) {
      throw new ConflictException('Cannot remove the last sign-in method');
    }
    await this.assertCurrentPassword(user, password);
    if (user.googleSub === null) {
      return user;
    }

    const unlinked = await this.userRepository.detachGoogleAccount(user.id);
    await this.sendSecurityNotice(
      user.email,
      'MEMORA - Tài khoản Google đã được hủy liên kết',
      'Tài khoản Google vừa được hủy liên kết khỏi tài khoản MEMORA của bạn. Nếu bạn không thực hiện thao tác này, hãy đổi mật khẩu ngay.',
    );
    return unlinked;
  }

  private async requirePasswordAccount(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (
      user === null ||
      !isActiveUserStatus(user.status) ||
      user.passwordHash === null
    ) {
      throw new BadRequestException('Google linking is unavailable');
    }
    return user;
  }

  private async assertCurrentPassword(
    user: User,
    password: string,
  ): Promise<void> {
    if (user.passwordHash === null) {
      throw new BadRequestException('Google linking is unavailable');
    }
    const matches = await this.passwords.verify(user.passwordHash, password);
    if (!matches) {
      throw new UnauthorizedException('Current credential is incorrect');
    }
  }

  private async assertGoogleAvailable(
    user: User,
    identity: VerifiedGoogleIdentity,
  ): Promise<void> {
    const owner = await this.userRepository.findByGoogleSub(identity.googleSub);
    if (owner !== null && owner.id !== user.id) {
      throw new ConflictException('This Google account is already linked');
    }
    const emailOwner = await this.users.findAuthByEmail(
      normalizeEmail(identity.email),
    );
    if (emailOwner !== null && emailOwner.id !== user.id) {
      throw new ConflictException('This Google email is already registered');
    }
    if (user.googleSub !== null && user.googleSub !== identity.googleSub) {
      throw new ConflictException('This account is already linked to Google');
    }
  }

  private async linkVerifiedGoogle(
    user: User,
    googleSub: string,
    emailDiffers: boolean,
  ): Promise<User> {
    try {
      const linked = await this.userRepository.attachGoogleAccount(
        user.id,
        googleSub,
        emailDiffers,
      );
      await this.sendSecurityNotice(
        user.email,
        'MEMORA - Tài khoản Google đã được liên kết',
        'Tài khoản Google vừa được liên kết với tài khoản MEMORA của bạn. Nếu bạn không thực hiện thao tác này, hãy đổi mật khẩu ngay.',
      );
      return linked;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      throw new ConflictException('This Google account is already linked');
    }
  }

  private async sendSecurityNotice(
    to: string,
    subject: string,
    text: string,
  ): Promise<void> {
    try {
      await this.emailSender.send({
        to,
        template: 'security-notice',
        subject,
        text,
      });
    } catch (error) {
      this.logger.error(
        `Security notice failed: ${error instanceof Error ? error.name : 'Error'}`,
      );
    }
  }

  private async signInExisting(user: User): Promise<AuthSession> {
    if (!isActiveUserStatus(user.status)) {
      throw new UnauthorizedException(UNABLE_TO_SIGN_IN);
    }
    const updated = await this.userRepository.updateById(user.id, {
      lastLoginAt: new Date(),
    });
    await this.securityAudit.record({
      userId: updated.id,
      action: SECURITY_AUDIT_ACTION.LOGIN,
      metadata: { method: 'google' },
    });
    return this.issueSession(updated);
  }

  private async registerGoogleCustomer(
    identity: VerifiedGoogleIdentity,
  ): Promise<AuthSession> {
    const email = identity.email.trim().toLowerCase();
    const colliding = await this.users.findAuthByEmail(email);
    if (colliding !== null) {
      throw new ConflictException(EMAIL_ALREADY_REGISTERED);
    }

    const customerRole = await this.roles.findByCode(ROLE_CODE.CUSTOMER);
    if (customerRole === null || !customerRole.isActive) {
      this.logger.error(
        'IAM configuration error: system role CUSTOMER is missing or inactive; Google registration cannot proceed',
      );
      throw new ServiceUnavailableException(
        'Customer registration is unavailable',
      );
    }

    try {
      const created = await this.userRepository.createWithRoleAssignment(
        {
          email,
          fullName: identity.fullName,
          googleSub: identity.googleSub,
          authProvider: AUTH_PROVIDER.GOOGLE,
          status: USER_STATUS.ACTIVE,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
          passwordHash: null,
        },
        customerRole.id,
      );
      await this.securityAudit.record({
        userId: created.id,
        action: SECURITY_AUDIT_ACTION.LOGIN,
        metadata: { method: 'google' },
      });
      return this.issueSession(created);
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      const raced = await this.userRepository.findByGoogleSub(
        identity.googleSub,
      );
      if (raced !== null) {
        return this.signInExisting(raced);
      }
      throw new ConflictException(EMAIL_ALREADY_REGISTERED);
    }
  }

  private async issueSession(user: User): Promise<AuthSession> {
    const refresh = await this.refreshTokens.createSession(user.id);
    return this.toAuthSession(toPublicUser(user), refresh);
  }

  private toAuthSession(
    user: PublicUser,
    refresh: IssuedRefreshSession,
  ): AuthSession {
    const signed = this.accessTokens.sign(user.id);
    return {
      user,
      accessToken: signed.token,
      refreshToken: refresh.refreshToken,
      tokenType: 'Bearer',
      expiresInSeconds: signed.expiresInSeconds,
      refreshExpiresInSeconds: refresh.refreshExpiresInSeconds,
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
