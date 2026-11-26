import { Injectable, Logger } from '@nestjs/common';
import type { RingItemSummary, VerifiedActor } from '@app/contracts';
import { MemoryGrpcClient } from '../../../memory/clients/memory-grpc.client';
import { OrderingGrpcClient } from '../../clients/ordering-grpc.client';
import { toGetOrderByIdGrpcRequest } from '../mappers/checkout-orders-http.mapper';

const MEMORY_PROVISION_TIMEOUT_MS = 3000;

@Injectable()
export class CheckoutOrderMemoryOrchestrator {
  private readonly logger = new Logger(CheckoutOrderMemoryOrchestrator.name);

  constructor(
    private readonly orderingClient: OrderingGrpcClient,
    private readonly memoryClient: MemoryGrpcClient,
  ) {}

  async provisionCardsForCreatedOrder(
    actor: VerifiedActor,
    items: readonly RingItemSummary[] | undefined,
    recipientEmail?: string,
  ): Promise<void> {
    const ownerCustomerIdentityId = actor.customerIdentityId;
    const ownerEmail = recipientEmail?.trim();
    if (
      !items ||
      items.length === 0 ||
      !ownerCustomerIdentityId ||
      !ownerEmail
    ) {
      return;
    }

    for (const item of items) {
      if (!item.memoryEnabled) {
        continue;
      }

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          this.memoryClient.provisionMemoryCard({
            actor,
            ringItemId: item.id,
            ownerCustomerIdentityId,
            ownerEmail,
          }),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(
              () => reject(new Error('Provision timeout')),
              MEMORY_PROVISION_TIMEOUT_MS,
            );
          }),
        ]);
      } catch (err: unknown) {
        // Fault-tolerant: non-blocking, fallback runs on getRingItemDetails
        this.logger.warn(
          `Non-blocking memory card provisioning failed for ringItemId=${item.id}`,
          err,
        );
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    }
  }

  async resolveMemoryCardForRingItem(
    actor: VerifiedActor,
    orderId: string,
    ringItemId: string,
    memoryEnabled: boolean,
  ): Promise<{ id: string; status: string } | undefined> {
    if (!memoryEnabled) {
      return undefined;
    }

    try {
      const card = await this.memoryClient.getCardByRingItemId({
        actor,
        ringItemId,
      });
      return { id: card.id, status: card.status };
    } catch (lookupErr: unknown) {
      this.logger.warn(
        `Lazy memory card lookup missed for ringItemId=${ringItemId}`,
        lookupErr,
      );
    }

    if (!actor.customerIdentityId) {
      return undefined;
    }

    try {
      const order = await this.orderingClient.getOrderById(
        toGetOrderByIdGrpcRequest(actor, orderId),
      );
      const ownerEmail = order.recipientEmail?.trim();
      if (!ownerEmail) {
        return undefined;
      }

      const card = await this.memoryClient.provisionMemoryCard({
        actor,
        ringItemId,
        ownerCustomerIdentityId: actor.customerIdentityId,
        ownerEmail,
      });
      return { id: card.id, status: card.status };
    } catch (provisionErr: unknown) {
      this.logger.warn(
        `Lazy memory card provisioning failed for ringItemId=${ringItemId}`,
        provisionErr,
      );
      return undefined;
    }
  }
}
