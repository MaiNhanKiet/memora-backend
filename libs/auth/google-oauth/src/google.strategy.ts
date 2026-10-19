import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import {
  GOOGLE_OAUTH_OPTIONS,
  GOOGLE_OAUTH_SCOPES,
  GOOGLE_OAUTH_STRATEGY,
} from './constants/google-oauth.constants';
import type {
  GoogleOAuthModuleOptions,
  GoogleOAuthRequest,
  VerifiedGoogleOAuthIdentity,
} from './interfaces/google-oauth.interfaces';

type GoogleCallbackParams = {
  id_token?: string;
};

type GoogleAuthenticateOptions = {
  codeChallenge?: string;
  codeVerifier?: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  Strategy,
  GOOGLE_OAUTH_STRATEGY,
  true,
) {
  private readonly clientId: string;
  private readonly callbackUrl: string;

  constructor(@Inject(GOOGLE_OAUTH_OPTIONS) options: GoogleOAuthModuleOptions) {
    const clientId = options.enabled ? options.clientId : 'disabled';
    const callbackUrl = options.enabled
      ? options.callbackUrl
      : 'http://127.0.0.1/disabled';
    super({
      clientID: clientId,
      clientSecret: options.enabled ? options.clientSecret : 'disabled-secret',
      callbackURL: callbackUrl,
      scope: [...GOOGLE_OAUTH_SCOPES],
      passReqToCallback: true,
    });
    this.clientId = clientId;
    this.callbackUrl = callbackUrl;
  }

  authorizationUrl(state: string, codeChallenge: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.callbackUrl);
    url.searchParams.set('scope', GOOGLE_OAUTH_SCOPES.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('prompt', 'select_account');
    return url.toString();
  }

  authorizationParams(
    options: GoogleAuthenticateOptions,
  ): Record<string, string> {
    if (
      typeof options.codeChallenge !== 'string' ||
      options.codeChallenge.length === 0
    ) {
      return {};
    }
    return {
      code_challenge: options.codeChallenge,
      code_challenge_method: 'S256',
    };
  }

  tokenParams(options: GoogleAuthenticateOptions): Record<string, string> {
    const verifier = options.codeVerifier;
    if (typeof verifier !== 'string' || verifier.length === 0) {
      throw new UnauthorizedException();
    }
    return { code_verifier: verifier };
  }

  validate(
    _request: GoogleOAuthRequest,
    _accessToken: string,
    _refreshToken: string,
    params: GoogleCallbackParams,
    _profile: unknown,
  ): VerifiedGoogleOAuthIdentity {
    const idToken = params.id_token;
    if (typeof idToken !== 'string' || idToken.length === 0) {
      throw new UnauthorizedException('Google sign-in is unavailable');
    }
    return { idToken };
  }
}
