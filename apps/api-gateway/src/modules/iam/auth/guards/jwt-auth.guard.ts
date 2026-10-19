import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_METADATA } from '@app/common';
import { ACTOR_TYPE, parseActorContext, setActorContext } from '@app/logger';
import type { Request } from 'express';
import { IamGrpcClient } from '../../clients/iam-grpc.client';
import type { GatewayAuthenticatedPrincipal } from '../gateway-principal';

interface RequestWithPrincipal extends Request {
  user?: GatewayAuthenticatedPrincipal;
}

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

    const isPublic = this.reflector.getAllAndOverride<boolean>(
      AUTH_METADATA.PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
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
    return true;
  }
}

function optionalId(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
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
