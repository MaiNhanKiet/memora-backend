import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedPrincipal } from '@app/auth';

export interface CartActor {
  userId?: string;
  guestSessionId?: string;
}

interface RequestWithOptionalUser extends Request {
  user?: AuthenticatedPrincipal;
}

export const ExtractCartActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CartActor => {
    const request = ctx.switchToHttp().getRequest<RequestWithOptionalUser>();

    const userId = request.user?.userId?.trim();
    const guestSessionHeader = request.headers['x-guest-session-id'];
    const guestSessionId =
      typeof guestSessionHeader === 'string'
        ? guestSessionHeader.trim()
        : Array.isArray(guestSessionHeader) && guestSessionHeader[0]
          ? guestSessionHeader[0].trim()
          : undefined;

    if (!userId && !guestSessionId) {
      throw new BadRequestException(
        'Missing actor identity: provide Bearer JWT or x-guest-session-id header',
      );
    }

    return {
      userId: userId || undefined,
      guestSessionId: guestSessionId || undefined,
    };
  },
);
