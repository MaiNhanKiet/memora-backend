import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Type,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Metadata } from '@grpc/grpc-js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { INTERNAL_GRPC_AUTH_METADATA_KEY } from '../constants/internal-grpc.constants';

/**
 * Builds the guard that checks the Gateway -> service internal caller secret.
 * `secretConfigPath` is the ConfigService path of that service's secret, for
 * example `commerce.internalGrpcSecret`. This proves the caller is the Gateway.
 * It is NOT user authorization: derive the actor from verified credentials.
 */
export function createInternalGrpcAuthGuard(
  secretConfigPath: string,
): Type<CanActivate> {
  @Injectable()
  class InternalGrpcAuthGuard implements CanActivate {
    constructor(private readonly config: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
      const expected = this.config.getOrThrow<string>(secretConfigPath);
      const provided = readInternalCredential(context);
      if (provided === undefined || !credentialsMatch(provided, expected)) {
        throw new UnauthorizedException('Unauthenticated');
      }
      return true;
    }
  }
  return InternalGrpcAuthGuard;
}

function readInternalCredential(context: ExecutionContext): string | undefined {
  const metadata = resolveMetadata(context);
  if (metadata === undefined) {
    return undefined;
  }
  const first = metadata.get(INTERNAL_GRPC_AUTH_METADATA_KEY)[0];
  if (typeof first === 'string' && first.length > 0) {
    return first;
  }
  if (Buffer.isBuffer(first) && first.length > 0) {
    return first.toString('utf8');
  }
  return undefined;
}

function resolveMetadata(context: ExecutionContext): Metadata | undefined {
  const rpcContext = context.switchToRpc().getContext<unknown>();
  if (rpcContext instanceof Metadata) {
    return rpcContext;
  }
  const args: unknown[] = context.getArgs();
  const maybeMetadata = args[1];
  return maybeMetadata instanceof Metadata ? maybeMetadata : undefined;
}

function credentialsMatch(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided).digest();
  const expectedDigest = createHash('sha256').update(expected).digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}
