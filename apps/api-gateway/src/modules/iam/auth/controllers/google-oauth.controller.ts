import {
  Controller,
  Get,
  Req,
  Res,
  UnauthorizedException,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GoogleOAuthGuard } from '@app/auth/google-oauth';
import type { VerifiedGoogleOAuthIdentity } from '@app/auth/google-oauth';
import { Public, SkipResponseTransform } from '@app/common';
import type { Request, Response } from 'express';
import { AuthCookieService } from '../cookies/auth-cookie.service';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import { AuthRateLimit } from '../decorators/auth-rate-limit.decorator';
import { GoogleOAuthRedirectFilter } from '../filters/google-oauth-redirect.filter';

@ApiTags('Auth')
@Controller('auth')
export class GoogleOAuthController {
  constructor(
    private readonly iam: IamGrpcClient,
    private readonly cookies: AuthCookieService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @Public()
  @AuthRateLimit(20, 15)
  @SkipResponseTransform()
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth Authorization Code flow' })
  start(): void {
    return;
  }

  @Get('google/callback')
  @Public()
  @AuthRateLimit(20, 15)
  @SkipResponseTransform()
  @UseFilters(GoogleOAuthRedirectFilter)
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary:
      'Google OAuth callback; sets cookies and redirects to the frontend',
  })
  async callback(
    @Req() request: Request & { user?: VerifiedGoogleOAuthIdentity },
    @Res() response: Response,
  ): Promise<void> {
    const identity = request.user;
    if (identity === undefined || identity.idToken.length === 0) {
      throw new UnauthorizedException();
    }

    const session = await this.iam.authenticateGoogle(identity.idToken);
    this.cookies.attachSession(
      response,
      session.refreshCredential,
      session.refreshExpiresInSeconds,
    );
    response.redirect(302, this.successUrl());
  }

  private successUrl(): string {
    return this.config.getOrThrow<string>('apiGateway.frontendAuthSuccessUrl');
  }
}
