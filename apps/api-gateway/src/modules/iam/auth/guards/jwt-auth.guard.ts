import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_METADATA } from '@app/common';
import { ACTOR_TYPE, parseActorContext, setActorContext } from '@app/logger';
import type { Request } from 'express';
import type { GatewayGuest } from '../../../../common/grpc/gateway-guest';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import type { GatewayAuthenticatedPrincipal } from '../gateway-principal';
import { hasRbacMetadata } from './guest-route-policy.check';

interface RequestWithPrincipal extends Request {
  user?: GatewayAuthenticatedPrincipal;
  guest?: GatewayGuest;
}

interface GuestAllowance {
  readonly session?: boolean;
  readonly verified?: boolean;
}

const GUEST_SESSION_HEADER = 'x-guest-session';
const GUEST_ACCESS_HEADER = 'x-guest-access';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly iam: IamGrpcClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_METADATA.PUBLIC,
      targets,
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    if (hasBearerHeader(request)) {
      await this.authenticateUser(request);
      return true;
    }

    const allowance = this.reflector.getAllAndOverride<
      GuestAllowance | undefined
    >(AUTH_METADATA.ALLOW_GUEST, targets);
    if (allowance === undefined || hasRbacMetadata(this.reflector, targets)) {
      throw new UnauthorizedException();
    }
    await this.authenticateGuest(request, allowance);
    return true;
  }

  private async authenticateUser(request: RequestWithPrincipal): Promise<void> {
    const accessCredential = readBearerCredential(request);
    const principal = await this.iam.validateAccessToken(accessCredential);
    const customerIdentityId = optionalId(principal.customerIdentityId);
    request.user = {
      userId: principal.userId,
      accessCredential,
      emailVerified: principal.emailVerified,
      tokenId: principal.tokenId,
      ...(customerIdentityId === undefined ? {} : { customerIdentityId }),
    };
    setActorContext(
      parseActorContext(ACTOR_TYPE.USER, principal.userId, customerIdentityId),
    );
  }

  private async authenticateGuest(
    request: RequestWithPrincipal,
    allowance: GuestAllowance,
  ): Promise<void> {
    const accessToken = readHeader(request, GUEST_ACCESS_HEADER);
    const sessionToken = readHeader(request, GUEST_SESSION_HEADER);
    try {
      if (allowance.verified === true && accessToken !== undefined) {
        const result = await this.iam.validateGuestAccessToken(accessToken);
        request.guest = {
          kind: 'VERIFIED_GUEST',
          customerIdentityId: result.customerIdentityId,
        };
        setActorContext(
          parseActorContext(
            ACTOR_TYPE.GUEST,
            result.customerIdentityId,
            result.customerIdentityId,
          ),
        );
        return;
      }
      if (allowance.session === true && sessionToken !== undefined) {
        const result = await this.iam.validateGuestSession(sessionToken);
        request.guest = {
          kind: 'GUEST_SESSION',
          guestSessionId: result.guestSessionId,
        };
        setActorContext({
          actorType: ACTOR_TYPE.GUEST,
          actorId: result.guestSessionId,
        });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() === 401) {
        throw new UnauthorizedException();
      }
      throw error;
    }
    throw new UnauthorizedException();
  }
}

function optionalId(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
}

function hasBearerHeader(request: Request): boolean {
  const header = request.headers.authorization;
  return header !== undefined && header.length > 0;
}

function readBearerCredential(request: Request): string {
  const header = request.headers.authorization;
  if (header === undefined || !header.startsWith('Bearer ')) {
    throw new UnauthorizedException();
  }
  const credential = header.slice('Bearer '.length).trim();
  if (credential.length === 0) {
    throw new UnauthorizedException();
  }
  return credential;
}

function readHeader(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
