import { Module } from '@nestjs/common';
import { RedisModule } from '../persistence/redis/redis.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AccessTokenService } from './auth/access-token.service';
import { AuthenticationService } from './auth/authentication.service';
import { GoogleAuthService } from './auth/google-auth.service';
import { GoogleIdTokenVerifier } from './auth/google-id-token.verifier';
import { EMAIL_SENDER } from './auth/email-sender';
import { EmailVerificationService } from './auth/email-verification.service';
import { ResendEmailSender } from './auth/resend-email.sender';
import { PasswordHasher } from './auth/password-hasher';
import { PasswordRecoveryService } from './auth/password-recovery.service';
import { SecurityAuditService } from './auth/security-audit.service';
import { RefreshTokenService } from './auth/refresh-token.service';
import { AuthorizationService } from './authorization/authorization.service';
import { CustomerIdentitiesService } from './users/customer-identities.service';
import { UsersService } from './users/users.service';
import { CatalogAdminService } from './admin/catalog-admin.service';
import { SecurityAuditAdminService } from './admin/security-audit-admin.service';
import { IamAdminPolicyService } from './admin/iam-admin-policy.service';
import { UserAdminService } from './admin/user-admin.service';
import { UserRoleAdminService } from './admin/user-role-admin.service';

@Module({
  imports: [RepositoriesModule, RedisModule],
  providers: [
    UsersService,
    CustomerIdentitiesService,
    AuthorizationService,
    PasswordHasher,
    AccessTokenService,
    RefreshTokenService,
    AuthenticationService,
    GoogleIdTokenVerifier,
    GoogleAuthService,
    {
      provide: EMAIL_SENDER,
      useClass: ResendEmailSender,
    },
    EmailVerificationService,
    PasswordRecoveryService,
    SecurityAuditService,
    IamAdminPolicyService,
    UserAdminService,
    UserRoleAdminService,
    CatalogAdminService,
    SecurityAuditAdminService,
  ],
  exports: [
    UsersService,
    CustomerIdentitiesService,
    AuthorizationService,
    AuthenticationService,
    GoogleAuthService,
    PasswordHasher,
    EmailVerificationService,
    PasswordRecoveryService,
    UserAdminService,
    UserRoleAdminService,
    CatalogAdminService,
    SecurityAuditAdminService,
  ],
})
export class ApplicationModule {}
