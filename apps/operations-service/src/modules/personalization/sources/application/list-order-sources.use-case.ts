import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type {
  ListOrderSourcesRequest,
  ListOrderSourcesResponse,
  PersonalizationSource,
} from '@app/contracts';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
} from '../../shared/order-context/order-personalization-context.port';
import {
  ORDER_SOURCES_REPOSITORY,
  type OrderSourceRecord,
  type OrderSourcesRepository,
} from './order-sources.repository';
import { sourceErrors, SourceReason } from './sources.errors';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PERSO-011. The order owner comes from Commerce (fail closed when Commerce is
 * down); the repository filters by the actor again.
 */
@Injectable()
export class ListOrderSourcesUseCase {
  constructor(
    @Inject(ORDER_SOURCES_REPOSITORY)
    private readonly sources: OrderSourcesRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
  ) {}

  async execute(
    request: ListOrderSourcesRequest,
  ): Promise<ListOrderSourcesResponse> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    if (typeof request.orderId !== 'string' || !UUID.test(request.orderId)) {
      throw sourceErrors.invalid(SourceReason.INVALID_ORDER_ID);
    }
    const orderId = request.orderId.toLowerCase();

    const order = await this.orders.getOrderPersonalizationContext(orderId);
    if (order === undefined) {
      throw sourceErrors.notFound(SourceReason.ORDER_NOT_FOUND);
    }
    if (
      order.ownerCustomerIdentityId.toLowerCase() !==
      actor.customerIdentityId.toLowerCase()
    ) {
      throw sourceErrors.forbidden(SourceReason.ORDER_NOT_OWNED);
    }

    const records = await this.sources.listForOrder(
      orderId,
      actor.customerIdentityId,
    );
    return { items: records.map(toPersonalizationSource) };
  }
}

function toPersonalizationSource(
  record: OrderSourceRecord,
): PersonalizationSource {
  return {
    sourceId: record.sourceId,
    sourceType: record.sourceType,
    status: record.status,
    failureCode: record.failureCode,
    acceptedAt: record.acceptedAt?.toISOString(),
    ringItemIds: [...record.ringItemIds],
    bindingMode: record.bindingMode,
  };
}
