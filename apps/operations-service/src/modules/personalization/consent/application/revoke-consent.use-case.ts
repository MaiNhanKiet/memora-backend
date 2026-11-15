import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type { Consent, RevokeConsentRequest } from '@app/contracts';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
} from '../../shared/order-context/order-personalization-context.port';
import { consentErrors, ConsentReason } from './consent.errors';
import { toConsent } from './consent.mapper';
import {
  CONSENT_REPOSITORY,
  type ConsentRepository,
} from './consent.repository';
import { requireUuid } from './consent.validation';

/** D-P-13: a linked item whose current version is in one of these states locks the consent. */
const LOCKING_VERSION_STATUSES: ReadonlySet<string> = new Set([
  'SUBMITTED',
  'MANAGER_APPROVED',
]);

/** PERSO-003. Only changes the consent row. */
@Injectable()
export class RevokeConsentUseCase {
  constructor(
    @Inject(CONSENT_REPOSITORY) private readonly consents: ConsentRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
  ) {}

  async execute(request: RevokeConsentRequest): Promise<Consent> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      ConsentReason.INVALID_ORDER_ID,
    );
    const consentId = requireUuid(
      request.consentId,
      ConsentReason.INVALID_CONSENT_ID,
    );

    const consent = await this.consents.findByIdForCustomer(
      consentId,
      orderId,
      actor.customerIdentityId,
    );
    if (consent === undefined) {
      throw consentErrors.notFound(ConsentReason.CONSENT_NOT_FOUND);
    }
    if (consent.status === 'REVOKED') {
      return toConsent(consent);
    }

    const order = await this.orders.getOrderPersonalizationContext(orderId);
    if (order === undefined) {
      // A consent exists for an order Commerce no longer knows: do not revoke blindly.
      throw consentErrors.notFound(ConsentReason.ORDER_NOT_FOUND);
    }
    const linked = new Set(consent.ringItemIds.map((id) => id.toLowerCase()));
    const locked = order.ringItems.some(
      (item) =>
        linked.has(item.ringItemId.toLowerCase()) &&
        LOCKING_VERSION_STATUSES.has(item.versionStatus),
    );
    if (locked) {
      throw consentErrors.precondition(ConsentReason.CONSENT_LOCKED);
    }

    await this.consents.markRevoked(consent.id, new Date());
    const updated = await this.consents.findByIdForCustomer(
      consentId,
      orderId,
      actor.customerIdentityId,
    );
    if (updated === undefined) {
      throw consentErrors.notFound(ConsentReason.CONSENT_NOT_FOUND);
    }
    return toConsent(updated);
  }
}
