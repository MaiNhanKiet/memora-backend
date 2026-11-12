import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';
import {
  INTERNAL_GRPC_AUTH_METADATA_KEY,
  mapGrpcErrorToHttpException,
} from '@app/common';
import { createOutgoingGrpcMetadata } from '@app/logger';
import type { Metadata } from '@grpc/grpc-js';
import { join } from 'node:path';
import { Observable, firstValueFrom, timeout } from 'rxjs';

export const DOMAIN_RPC_TIMEOUT_MS = 5000;

export interface DomainGrpcClientDefinition {
  /** Injection token, for example COMMERCE_CATALOG_GRPC_CLIENT. */
  readonly name: string;
  /** ConfigService key of the service URL, for example apiGateway.commerceGrpcUrl. */
  readonly urlConfigKey: string;
  /** proto package, for example memora.catalog.v1. */
  readonly protoPackage: string;
  /** Proto file relative to proto/, for example catalog/v1/catalog.proto. */
  readonly protoFile: string;
}

/**
 * `ClientsModule.registerAsync([domainGrpcClientOptions({...})])` for one domain
 * proto. The URL is read with getOrThrow, so the Gateway fails fast at boot when
 * the matching <SERVICE>_GRPC_URL is missing.
 */
export function domainGrpcClientOptions(
  definition: DomainGrpcClientDefinition,
): ClientsProviderAsyncOptions {
  return {
    name: definition.name,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.GRPC,
      options: {
        url: configService.getOrThrow<string>(definition.urlConfigKey),
        package: definition.protoPackage,
        protoPath: join(process.cwd(), 'proto', definition.protoFile),
        loader: {
          includeDirs: [join(process.cwd(), 'proto')],
          longs: String,
          keepCase: false,
        },
      },
    }),
  };
}

/**
 * Base class for a Gateway client of one domain proto. Subclass it, resolve the
 * gRPC service in onModuleInit, and wrap each RPC with `this.unary(...)`.
 * `unary` adds the internal caller secret and request correlation metadata,
 * applies the timeout and maps gRPC failures to HTTP exceptions.
 */
export abstract class DomainGrpcClient {
  protected constructor(configService: ConfigService, secretConfigKey: string) {
    this.internalSecret = configService.getOrThrow<string>(secretConfigKey);
  }

  private readonly internalSecret: string;

  protected async unary<T>(
    call: (metadata: Metadata) => Observable<T>,
  ): Promise<T> {
    const metadata = createOutgoingGrpcMetadata();
    metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, this.internalSecret);
    try {
      return await firstValueFrom(
        call(metadata).pipe(timeout(DOMAIN_RPC_TIMEOUT_MS)),
      );
    } catch (error: unknown) {
      throw mapGrpcErrorToHttpException(error);
    }
  }
}
