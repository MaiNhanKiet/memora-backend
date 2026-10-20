import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GOOGLE_OAUTH_OPTIONS,
  GOOGLE_OAUTH_STATE_STORE,
  GoogleStrategy,
  createGoogleOAuthStart,
} from '@app/auth/google-oauth';
import type {
  GoogleOAuthModuleOptions,
  GoogleOAuthStateStore,
} from '@app/auth/google-oauth';
import { Public, SuccessMessage } from '@app/common';
import type { Request, Response } from 'express';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import type { GatewayAuthenticatedPrincipal } from '../gateway-principal';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import {
  ApiAcceptedDocs,
  ApiAuthSessionDocs,
  ApiChangePasswordDocs,
  ApiLinkGoogleDocs,
  ApiUnlinkGoogleDocs,
  ApiCookieCsrfDocs,
  ApiLogoutDocs,
  ApiMeDocs,
  ApiRegisterChallengeDocs,
  ApiResendVerificationDocs,
} from '../docs/auth.swagger';
import { ChangePasswordRequestDto } from '../dto/request/change-password.request.dto';
import { LinkGoogleAccountRequestDto } from '../dto/request/link-google-account.request.dto';
import { UnlinkGoogleAccountRequestDto } from '../dto/request/unlink-google-account.request.dto';
import { ConfirmRegistrationRequestDto } from '../dto/request/confirm-registration.request.dto';
import { ForgotPasswordRequestDto } from '../dto/request/forgot-password.request.dto';
import { LoginRequestDto } from '../dto/request/login.request.dto';
import { RegisterRequestDto } from '../dto/request/register.request.dto';
import { ResendVerificationRequestDto } from '../dto/request/resend-verification.request.dto';
import { ResetPasswordRequestDto } from '../dto/request/reset-password.request.dto';
import type { AuthSessionResponseDto } from '../dto/response/auth-session.response.dto';
import type { RegisterChallengeResponseDto } from '../dto/response/register-challenge.response.dto';
import { CsrfTokenResponseDto } from '../dto/response/csrf-token.response.dto';
import {
  toAuthSessionHttp,
  toPublicUserResponse,
} from '../mappers/auth-http.mapper';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AuthRateLimit } from '../decorators/auth-rate-limit.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly iam: IamGrpcClient,
    private readonly cookies: AuthCookieService,
    private readonly googleStrategy: GoogleStrategy,
    @Inject(GOOGLE_OAUTH_OPTIONS)
    private readonly googleOAuth: GoogleOAuthModuleOptions,
    @Inject(GOOGLE_OAUTH_STATE_STORE)
    private readonly oauthStates: GoogleOAuthStateStore,
  ) {}

  @Post('register')
  @Public()
  @AuthRateLimit(5, 15)
  @HttpCode(202)
  @SuccessMessage('Verification code sent')
  @ApiRegisterChallengeDocs()
  async register(
    @Body() body: RegisterRequestDto,
  ): Promise<RegisterChallengeResponseDto> {
    return this.iam.register({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      ...(body.phone === undefined ? {} : { phone: body.phone }),
    });
  }

  @Post('register/confirm')
  @Public()
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Registered')
  @ApiAuthSessionDocs('Confirm registration with the emailed code')
  async confirmRegistration(
    @Body() body: ConfirmRegistrationRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.iam.confirmRegistration(body.email, body.otp);
    this.cookies.attachSession(
      response,
      session.refreshCredential,
      session.refreshExpiresInSeconds,
    );
    return toAuthSessionHttp(session);
  }

  @Post('login')
  @Public()
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Authenticated')
  @ApiAuthSessionDocs('Log in with email and password')
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    const session = await this.iam.login({
      email: body.email,
      password: body.password,
    });
    this.cookies.attachSession(
      response,
      session.refreshCredential,
      session.refreshExpiresInSeconds,
    );
    return toAuthSessionHttp(session);
  }

  @Get('csrf')
  @Public()
  @SuccessMessage('CSRF token')
  @ApiOperation({
    summary:
      'Return the CSRF cookie value for session bootstrap after OAuth (requires refresh cookie)',
  })
  csrf(@Req() request: Request): CsrfTokenResponseDto {
    return { csrfToken: this.cookies.readCsrfToken(request) };
  }

  @Post('refresh')
  @Public()
  @HttpCode(200)
  @SuccessMessage('Refreshed')
  @ApiCookieCsrfDocs('Rotate the refresh session using the HttpOnly cookie')
  @ApiAuthSessionDocs('Rotate the refresh session using the HttpOnly cookie')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionResponseDto> {
    this.cookies.assertCsrf(request);
    const session = await this.iam.refreshToken(
      this.cookies.readRefreshCredential(request),
    );
    this.cookies.attachSession(
      response,
      session.refreshCredential,
      session.refreshExpiresInSeconds,
    );
    return toAuthSessionHttp(session);
  }

  @Post('logout')
  @Public()
  @HttpCode(200)
  @SuccessMessage('Signed out')
  @ApiCookieCsrfDocs('Revoke the current refresh session')
  @ApiLogoutDocs('Revoke the current refresh session')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<null> {
    this.cookies.assertCsrf(request);
    await this.iam.logout(this.cookies.readRefreshCredential(request));
    this.cookies.clearSession(response);
    return null;
  }

  @Post('logout-all')
  @HttpCode(200)
  @SuccessMessage('Signed out everywhere')
  @ApiLogoutDocs('Revoke every refresh session for the authenticated user')
  async logoutAll(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Res({ passthrough: true }) response: Response,
  ): Promise<null> {
    if (principal === undefined) {
      throw new UnauthorizedException();
    }
    await this.iam.logoutAll(principal.accessCredential);
    this.cookies.clearSession(response);
    return null;
  }

  @Get('me')
  @ApiMeDocs()
  async me(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
  ) {
    if (principal === undefined) {
      throw new UnauthorizedException();
    }
    const result = await this.iam.getCurrentUser(principal.accessCredential);
    return toPublicUserResponse(result.user);
  }

  @Post('resend-verification')
  @Public()
  @AuthRateLimit(5, 15)
  @HttpCode(200)
  @ApiResendVerificationDocs()
  resendVerification(@Body() body: ResendVerificationRequestDto) {
    return this.iam.resendVerificationEmail(body.email);
  }

  @Post('password/change')
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Password updated')
  @ApiChangePasswordDocs()
  async changePassword(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Body() body: ChangePasswordRequestDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<null> {
    if (principal === undefined) {
      throw new UnauthorizedException();
    }
    await this.iam.changePassword(
      principal.accessCredential,
      body.currentPassword,
      body.password,
    );
    this.cookies.clearSession(response);
    return null;
  }

  @Post('google/link')
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Google link accepted')
  @ApiLinkGoogleDocs()
  async linkGoogle(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Body() body: LinkGoogleAccountRequestDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (principal === undefined) {
      throw new UnauthorizedException();
    }
    if (!this.googleOAuth.enabled) {
      throw new UnauthorizedException('Google sign-in is unavailable');
    }
    const confirmationId = body.confirmationId;
    const password = body.password;
    if (confirmationId !== undefined && password === undefined) {
      const confirmed = await this.iam.confirmGoogleLink(
        principal.accessCredential,
        confirmationId,
      );
      return { user: toPublicUserResponse(confirmed.user) };
    }
    if (password !== undefined && confirmationId === undefined) {
      const started = await this.iam.startGoogleLink(
        principal.accessCredential,
        password,
      );
      const start = {
        ...createGoogleOAuthStart(this.googleOAuth.stateTtlSeconds),
        linkIntentId: started.intentId,
      };
      this.oauthStates.save(request, response, start);
      return {
        authorizationUrl: this.googleStrategy.authorizationUrl(
          start.state,
          start.codeChallenge,
        ),
      };
    }
    throw new BadRequestException('Send either password or confirmationId');
  }

  @Delete('google/link')
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Google account unlinked')
  @ApiUnlinkGoogleDocs()
  async unlinkGoogle(
    @CurrentUser() principal: GatewayAuthenticatedPrincipal | undefined,
    @Body() body: UnlinkGoogleAccountRequestDto,
  ) {
    if (principal === undefined) {
      throw new UnauthorizedException();
    }
    const result = await this.iam.unlinkGoogleAccount(
      principal.accessCredential,
      body.password,
    );
    return toPublicUserResponse(result.user);
  }

  @Post('password/forgot')
  @Public()
  @AuthRateLimit(5, 15)
  @HttpCode(200)
  @ApiAcceptedDocs('Request a password reset email')
  forgotPassword(@Body() body: ForgotPasswordRequestDto) {
    return this.iam.forgotPassword(body.email);
  }

  @Post('password/reset')
  @Public()
  @AuthRateLimit(10, 15)
  @HttpCode(200)
  @SuccessMessage('Password updated')
  @ApiLogoutDocs('Reset password with a recovery credential')
  async resetPassword(@Body() body: ResetPasswordRequestDto): Promise<null> {
    await this.iam.resetPassword(body.recoveryCredential, body.password);
    return null;
  }
}
