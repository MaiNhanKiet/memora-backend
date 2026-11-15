import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ClientGrpc } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { INTERNAL_GRPC_AUTH_METADATA_KEY } from '@app/common';
import {
  COMMERCE_ORDERING_SERVICE_NAME,
  type CommerceOrderingServiceClient,
  type GetOrderPersonalizationContextResponse,
} from '@app/contracts';
import { createOutgoingGrpcMetadata } from '@app/logger';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContext,
  type OrderPersonalizationContextPort,
  type PersonalizationPackage,
  type RingItemPersonalizationContext,
  type SourcePlanMode,
} from '../order-personalization-context.port';

export const COMMERCE_ORDERING_GRPC_CLIENT = Symbol(
  'COMMERCE_ORDERING_GRPC_CLIENT',
);
export const COMMERCE_RPC_TIMEOUT_MS = 5000;
export const COMMERCE_UNAVAILABLE = 'COMMERCE_UNAVAILABLE';

const SOURCE_PLAN_MODES: readonly string[] = ['N/A', 'SHARED', 'SEPARATE'];

/**
 * Real OrderPersonalizationContextPort: calls Commerce
 * `OrderingService.GetOrderPersonalizationContext` with the Commerce internal secret.
 * NOT_FOUND -> undefined. Any other failure (including a timeout or an unknown
 * source_plan_mode) throws 503 so callers fail closed.
 */
@Injectable()
export class CommerceOrderPersonalizationContextAdapter
  implements OrderPersonalizationContextPort, OnModuleInit
{
  private readonly logger = new Logger(
    CommerceOrderPersonalizationContextAdapter.name,
  );
  private ordering!: CommerceOrderingServiceClient;
  private readonly internalSecret: string;

  constructor(
    @Inject(COMMERCE_ORDERING_GRPC_CLIENT) private readonly client: ClientGrpc,
    configService: ConfigService,
  ) {
    this.internalSecret = configService.getOrThrow<string>(
      'operations.commerceInternalGrpcSecret',
    );
  }

  onModuleInit(): void {
    this.ordering = this.client.getService<CommerceOrderingServiceClient>(
      COMMERCE_ORDERING_SERVICE_NAME,
    );
  }

  async getOrderPersonalizationContext(
    orderId: string,
  ): Promise<OrderPersonalizationContext | undefined> {
    const metadata = createOutgoingGrpcMetadata();
    metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, this.internalSecret);
    let response: GetOrderPersonalizationContextResponse;
    try {
      response = await firstValueFrom(
        this.ordering
          .getOrderPersonalizationContext({ orderId }, metadata)
          .pipe(timeout(COMMERCE_RPC_TIMEOUT_MS)),
      );
    } catch (error: unknown) {
      if (readGrpcCode(error) === GrpcStatus.NOT_FOUND) {
        return undefined;
      }
      this.logger.warn(
        `Commerce order context failed: ${error instanceof TimeoutError ? 'timeout' : String(readGrpcCode(error) ?? 'unknown')}`,
      );
      throw new ServiceUnavailableException(COMMERCE_UNAVAILABLE);
    }
    try {
      return mapContext(response);
    } catch {
      this.logger.warn('Commerce returned an unmappable order context');
      throw new ServiceUnavailableException(COMMERCE_UNAVAILABLE);
    }
  }
}

export const orderPersonalizationContextProvider = {
  provide: ORDER_PERSONALIZATION_CONTEXT_PORT,
  useExisting: CommerceOrderPersonalizationContextAdapter,
};

function readGrpcCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    return typeof code === 'number' ? code : undefined;
  }
  return undefined;
}

function mapContext(
  response: GetOrderPersonalizationContextResponse,
): OrderPersonalizationContext {
  if (!SOURCE_PLAN_MODES.includes(response.sourcePlanMode)) {
    throw new Error('Unknown source plan mode');
  }
  return {
    orderId: response.orderId,
    ownerCustomerIdentityId: response.ownerCustomerIdentityId,
    status: response.status,
    p1Paid: response.p1Paid === true,
    sourcePlanMode: response.sourcePlanMode as SourcePlanMode,
    ringItems: (response.ringItems ?? []).map(
      (item): RingItemPersonalizationContext => ({
        ringItemId: item.ringItemId,
        itemNo: item.itemNo,
        currentVersionId:
          item.currentVersionId === undefined || item.currentVersionId === ''
            ? undefined
            : item.currentVersionId,
        personalizationPackage: toPackage(item.personalizationPackage),
        versionStatus: item.versionStatus,
      }),
    ),
  };
}

function toPackage(value: string): PersonalizationPackage {
  return value === 'FINGERPRINT' || value === 'SOUNDWAVE' ? value : 'NONE';
}
