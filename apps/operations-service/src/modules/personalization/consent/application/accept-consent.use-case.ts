import { Inject, Injectable } from '@nestjs/common';
import { parseVerifiedActor, requireCustomerActor } from '@app/common';
import type {
  AcceptConsentRequest,
  Consent,
  ConsentType,
} from '@app/contracts';
import {
  ORDER_PERSONALIZATION_CONTEXT_PORT,
  type OrderPersonalizationContextPort,
  type PersonalizationPackage,
} from '../../shared/order-context/order-personalization-context.port';
import { consentErrors, ConsentReason } from './consent.errors';
import { toConsent } from './consent.mapper';
import {
  CONSENT_POLICY_VERSION,
  CONSENT_REPOSITORY,
  type ConsentRepository,
} from './consent.repository';
import {
  requireConsentType,
  requirePolicyVersion,
  requireRingItemIds,
  requireUuid,
} from './consent.validation';

const PACKAGE_FOR_TYPE: Record<ConsentType, PersonalizationPackage> = {
  FINGERPRINT_PROCESSING: 'FINGERPRINT',
  SOUNDWAVE_PROCESSING: 'SOUNDWAVE',
};

/** PERSO-001. Order facts come only from Commerce; the client never claims payment. */
@Injectable()
export class AcceptConsentUseCase {
  constructor(
    @Inject(CONSENT_REPOSITORY) private readonly consents: ConsentRepository,
    @Inject(ORDER_PERSONALIZATION_CONTEXT_PORT)
    private readonly orders: OrderPersonalizationContextPort,
    @Inject(CONSENT_POLICY_VERSION) private readonly policyVersion: string,
  ) {}

  async execute(request: AcceptConsentRequest): Promise<Consent> {
    const actor = requireCustomerActor(parseVerifiedActor(request.actor));
    const orderId = requireUuid(
      request.orderId,
      ConsentReason.INVALID_ORDER_ID,
    );
    const consentType = requireConsentType(request.consentType);
    const requestedPolicy = requirePolicyVersion(request.policyVersion);
    const ringItemIds = requireRingItemIds(request.ringItemIds);

    // Throws (503) when Commerce is down: fail closed, never "not found".
    const order = await this.orders.getOrderPersonalizationContext(orderId);
    if (order === undefined) {
      throw consentErrors.notFound(ConsentReason.ORDER_NOT_FOUND);
    }
    if (
      order.ownerCustomerIdentityId.toLowerCase() !==
      actor.customerIdentityId.toLowerCase()
    ) {
      throw consentErrors.forbidden(ConsentReason.ORDER_NOT_OWNED);
    }
    if (!order.p1Paid) {
      throw consentErrors.precondition(ConsentReason.P1_NOT_PAID);
    }
    if (requestedPolicy !== this.policyVersion) {
      throw consentErrors.precondition(ConsentReason.POLICY_VERSION_MISMATCH);
    }

    const orderItems = new Map(
      order.ringItems.map((item) => [item.ringItemId.toLowerCase(), item]),
    );
    const items = ringItemIds.map((id) => orderItems.get(id));
    if (items.some((item) => item === undefined)) {
      throw consentErrors.precondition(ConsentReason.RING_ITEM_NOT_IN_ORDER);
    }
    if (ringItemIds.length === 2 && order.sourcePlanMode !== 'SHARED') {
      throw consentErrors.precondition(ConsentReason.SHARED_SCOPE_NOT_ALLOWED);
    }
    const expectedPackage = PACKAGE_FOR_TYPE[consentType];
    if (
      items.some((item) => item?.personalizationPackage !== expectedPackage)
    ) {
      throw consentErrors.precondition(ConsentReason.PACKAGE_MISMATCH);
    }

    const { consent } = await this.consents.createAcceptedIfAbsent({
      customerIdentityId: actor.customerIdentityId,
      orderId,
      consentType,
      policyVersion: requestedPolicy,
      ringItemIds,
    });
    return toConsent(consent);
  }
}
