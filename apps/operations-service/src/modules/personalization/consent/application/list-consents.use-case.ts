import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type { ListConsentsRequest, ListConsentsResponse } from '@app/contracts';
import { ConsentReason } from './consent.errors';
import { toConsent } from './consent.mapper';
import {
  CONSENT_REPOSITORY,
  type ConsentRepository,
} from './consent.repository';
import { requireUuid } from './consent.validation';

/**
 * PERSO-002. Filters by order AND the actor's customer identity, so another
 * customer's order yields an empty list (no existence leak). No Commerce call.
 */
@Injectable()
export class ListConsentsUseCase {
  constructor(
    @Inject(CONSENT_REPOSITORY) private readonly consents: ConsentRepository,
  ) {}

  async execute(request: ListConsentsRequest): Promise<ListConsentsResponse> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      ConsentReason.INVALID_ORDER_ID,
    );
    const records = await this.consents.listByOrderForCustomer(
      orderId,
      actor.customerIdentityId,
    );
    return { items: records.map(toConsent) };
  }
}
