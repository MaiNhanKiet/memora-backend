import { Controller, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type {
  AuthenticateGoogleRequest,
  AuthSessionResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutAllRequest,
  LogoutRequest,
  LogoutResponse,
  RefreshTokenRequest,
  ConfirmRegistrationRequest,
  RegisterChallengeResponse,
  RegisterRequest,
  ResendVerificationEmailRequest,
  ResendVerificationEmailResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CompleteGoogleLinkRequest,
  CompleteGoogleLinkResponse,
  ConfirmGoogleLinkRequest,
  StartGoogleLinkRequest,
  StartGoogleLinkResponse,
  UnlinkGoogleAccountRequest,
  UserResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '@app/contracts';
import { AuthenticationService } from '../../application/auth/authentication.service';
import { GoogleAuthService } from '../../application/auth/google-auth.service';
import { EmailVerificationService } from '../../application/auth/email-verification.service';
import { PasswordRecoveryService } from '../../application/auth/password-recovery.service';
import {
  requireCredential,
  requireGoogleIdToken,
  optionalText,
  requireOtp,
  requireText,
} from './grpc-request';
import { InternalGrpcAuthGuard } from './internal-grpc-auth.guard';
import {
  toAuthSessionResponse,
  toPublicUserMessage,
} from './mappers/user.grpc.mapper';
import { toPublicUser } from '../../application/users/users.mapper';

@Controller()
@UseGuards(InternalGrpcAuthGuard)
export class AuthenticationGrpcController {
  constructor(
    private readonly authentication: AuthenticationService,
    private readonly googleAuth: GoogleAuthService,
    private readonly emailVerification: EmailVerificationService,
    private readonly passwordRecovery: PasswordRecoveryService,
  ) {}

  @GrpcMethod('IamService', 'Register')
  async register(request: RegisterRequest): Promise<RegisterChallengeResponse> {
    return this.authentication.registerCustomer({
      fullName: requireText(request.fullName, 'Full name', 150),
      email: requireText(request.email, 'Email', 255),
      password: requireText(request.password, 'Password', 128),
      phone: optionalText(request.phone, 'Phone', 30),
    });
  }

  @GrpcMethod('IamService', 'ConfirmRegistration')
  async confirmRegistration(
    request: ConfirmRegistrationRequest,
  ): Promise<AuthSessionResponse> {
    const session = await this.authentication.confirmRegistration(
      requireText(request.email, 'Email', 255),
      requireOtp(request.otp),
    );
    return toAuthSessionResponse(session);
  }

  @GrpcMethod('IamService', 'AuthenticateGoogle')
  async authenticateGoogle(
    request: AuthenticateGoogleRequest,
  ): Promise<AuthSessionResponse> {
    const session = await this.googleAuth.authenticate(
      requireGoogleIdToken(request.idToken),
    );
    return toAuthSessionResponse(session);
  }

  @GrpcMethod('IamService', 'Login')
  async login(request: LoginRequest): Promise<AuthSessionResponse> {
    const session = await this.authentication.login({
      email: requireText(request.email, 'Email', 255),
      password: requireText(request.password, 'Password', 128),
    });
    return toAuthSessionResponse(session);
  }

  @GrpcMethod('IamService', 'RefreshToken')
  async refreshToken(
    request: RefreshTokenRequest,
  ): Promise<AuthSessionResponse> {
    const session = await this.authentication.refresh(
      requireCredential(request.refreshCredential),
    );
    return toAuthSessionResponse(session);
  }

  @GrpcMethod('IamService', 'Logout')
  async logout(request: LogoutRequest): Promise<LogoutResponse> {
    await this.authentication.logout(
      requireCredential(request.refreshCredential),
    );
    return {};
  }

  @GrpcMethod('IamService', 'LogoutAll')
  async logoutAll(request: LogoutAllRequest): Promise<LogoutResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    await this.authentication.logoutAll(principal.user.id);
    return {};
  }

  @GrpcMethod('IamService', 'ResendVerificationEmail')
  async resendVerificationEmail(
    request: ResendVerificationEmailRequest,
  ): Promise<ResendVerificationEmailResponse> {
    return this.emailVerification.resend(
      requireText(request.email, 'Email', 255),
    );
  }

  @GrpcMethod('IamService', 'ForgotPassword')
  async forgotPassword(
    request: ForgotPasswordRequest,
  ): Promise<ForgotPasswordResponse> {
    return this.passwordRecovery.forgotPassword(
      requireText(request.email, 'Email', 255),
    );
  }

  @GrpcMethod('IamService', 'ResetPassword')
  async resetPassword(
    request: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    await this.passwordRecovery.resetPassword(
      requireCredential(request.recoveryCredential),
      requireText(request.password, 'Password', 128),
    );
    return {};
  }

  @GrpcMethod('IamService', 'ChangePassword')
  async changePassword(
    request: ChangePasswordRequest,
  ): Promise<ChangePasswordResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    await this.passwordRecovery.changePassword(
      principal.user.id,
      requireText(request.currentPassword, 'Current password', 128),
      requireText(request.password, 'Password', 128),
    );
    return {};
  }

  @GrpcMethod('IamService', 'StartGoogleLink')
  async startGoogleLink(
    request: StartGoogleLinkRequest,
  ): Promise<StartGoogleLinkResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    const intentId = await this.googleAuth.startGoogleLink(
      principal.user.id,
      requireText(request.password, 'Password', 128),
    );
    return { intentId };
  }

  @GrpcMethod('IamService', 'CompleteGoogleLink')
  async completeGoogleLink(
    request: CompleteGoogleLinkRequest,
  ): Promise<CompleteGoogleLinkResponse> {
    const result = await this.googleAuth.completeGoogleLink(
      requireText(request.intentId, 'Intent', 128),
      requireGoogleIdToken(request.idToken),
    );
    if (result.confirmationRequired) {
      return {
        confirmationRequired: true,
        confirmationId: result.confirmationId,
      };
    }
    return {
      confirmationRequired: false,
      confirmationId: '',
      user: toPublicUserMessage(toPublicUser(result.user)),
    };
  }

  @GrpcMethod('IamService', 'ConfirmGoogleLink')
  async confirmGoogleLink(
    request: ConfirmGoogleLinkRequest,
  ): Promise<UserResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    const user = await this.googleAuth.confirmGoogleLink(
      principal.user.id,
      requireText(request.confirmationId, 'Confirmation', 128),
    );
    return { user: toPublicUserMessage(toPublicUser(user)) };
  }

  @GrpcMethod('IamService', 'UnlinkGoogleAccount')
  async unlinkGoogleAccount(
    request: UnlinkGoogleAccountRequest,
  ): Promise<UserResponse> {
    const principal = await this.authentication.verifyAccessToken(
      requireCredential(request.accessCredential),
    );
    const user = await this.googleAuth.unlinkAccount(
      principal.user.id,
      requireText(request.password, 'Password', 128),
    );
    return { user: toPublicUserMessage(toPublicUser(user)) };
  }
}
