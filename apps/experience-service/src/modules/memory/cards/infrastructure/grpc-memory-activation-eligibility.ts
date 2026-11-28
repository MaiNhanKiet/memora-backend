import {
  Injectable,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpcProxy } from '@nestjs/microservices';
import { status as GrpcStatus, type Metadata } from '@grpc/grpc-js';
import { isUUID } from 'class-validator';
import { join } from 'node:path';
import { firstValueFrom, timeout } from 'rxjs';
import { INTERNAL_GRPC_AUTH_METADATA_KEY } from '@app/common';
import {
  COMMERCE_ORDERING_SERVICE_NAME,
  FULFILLMENT_PACKAGE,
  FULFILLMENT_SERVICE_NAME,
  type CommerceOrderingServiceClient,
  type FulfillmentServiceClient,
  type VerifiedActor,
} from '@app/contracts';
import { createOutgoingGrpcMetadata } from '@app/logger';
import type { MemoryActivationEligibility } from '../application/memory-activation-eligibility.port';

// Two sequential lookups leave time for local work before the Gateway's 5-second timeout.
const ACTIVATION_RPC_TIMEOUT_MS = 2000;

interface InternalTarget {
  readonly url: string;
  readonly secret: string;
}

function createClient(
  target: InternalTarget,
  packageName: string,
  proto: string,
): ClientGrpcProxy {
  const protoRoot = join(process.cwd(), 'proto');
  return new ClientGrpcProxy({
    url: target.url,
    package: packageName,
    protoPath: join(protoRoot, proto),
    loader: { includeDirs: [protoRoot], keepCase: false, longs: String },
  });
}

function callerMetadata(target: InternalTarget): Metadata {
  const metadata = createOutgoingGrpcMetadata();
  metadata.set(INTERNAL_GRPC_AUTH_METADATA_KEY, target.secret);
  return metadata;
}

@Injectable()
export class GrpcMemoryActivationEligibility
  implements MemoryActivationEligibility, OnModuleDestroy
{
  private readonly fulfillmentTarget?: InternalTarget;
  private readonly orderingTarget?: InternalTarget;
  private readonly fulfillmentClient?: ClientGrpcProxy;
  private readonly orderingClient?: ClientGrpcProxy;

  constructor(config: ConfigService) {
    this.fulfillmentTarget = config.get<InternalTarget>(
      'experience.memoryActivation.fulfillment',
    );
    this.orderingTarget = config.get<InternalTarget>(
      'experience.memoryActivation.ordering',
    );
    if (this.fulfillmentTarget && this.orderingTarget) {
      this.fulfillmentClient = createClient(
        this.fulfillmentTarget,
        FULFILLMENT_PACKAGE,
        'operations/v1/fulfillment.proto',
      );
      this.orderingClient = createClient(
        this.orderingTarget,
        'memora.commerce.v1',
        'commerce/v1/ordering.proto',
      );
    }
  }

  onModuleDestroy(): void {
    this.fulfillmentClient?.close();
    this.orderingClient?.close();
  }

  async isEligible(ringItemId: string, actor: VerifiedActor): Promise<boolean> {
    const {
      fulfillmentClient,
      orderingClient,
      fulfillmentTarget,
      orderingTarget,
    } = this;
    if (
      !fulfillmentClient ||
      !orderingClient ||
      !fulfillmentTarget ||
      !orderingTarget
    ) {
      throw new ServiceUnavailableException(
        'Memory activation checks are unavailable',
      );
    }

    let orderId: string;
    try {
      const fulfillment =
        fulfillmentClient.getService<FulfillmentServiceClient>(
          FULFILLMENT_SERVICE_NAME,
        );
      const proof = await firstValueFrom(
        fulfillment
          .getFullOrderHandoverForRingItem(
            { ringItemId },
            callerMetadata(fulfillmentTarget),
          )
          .pipe(timeout(ACTIVATION_RPC_TIMEOUT_MS)),
      );
      if (proof.completed === false) return false;
      if (
        proof.completed !== true ||
        !proof.orderId ||
        !isUUID(proof.orderId)
      ) {
        throw new Error('Invalid handover proof response');
      }
      orderId = proof.orderId;
    } catch (error: unknown) {
      throw new ServiceUnavailableException(
        'Handover verification is unavailable',
        { cause: error },
      );
    }

    try {
      const ordering = orderingClient.getService<CommerceOrderingServiceClient>(
        COMMERCE_ORDERING_SERVICE_NAME,
      );
      const order = await firstValueFrom(
        ordering
          .getOrderById({ orderId, actor }, callerMetadata(orderingTarget))
          .pipe(timeout(ACTIVATION_RPC_TIMEOUT_MS)),
      );
      const item = order.items?.find(({ id }) => id === ringItemId);
      return (
        order.id === orderId &&
        order.status === 'COMPLETED' &&
        order.finalPaymentSatisfied === true &&
        item?.memoryEnabled === true &&
        (item.personalizationPackage === 'FINGERPRINT' ||
          item.personalizationPackage === 'SOUNDWAVE')
      );
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === GrpcStatus.NOT_FOUND
      ) {
        return false;
      }
      throw new ServiceUnavailableException(
        'Order verification is unavailable',
        { cause: error },
      );
    }
  }
}
