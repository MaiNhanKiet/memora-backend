import type { OrderPersonalizationContext } from '../../shared/order-context/order-personalization-context.port';
import {
  SOUNDWAVE_CONSENT_TYPE,
  SOUNDWAVE_PACKAGE,
} from './soundwave-upload.config';
import {
  soundwaveUploadErrors,
  SoundwaveUploadReason,
} from './soundwave-upload.errors';
import type { UploadConsentRecord } from './soundwave-upload.repository';

/** The order exists (Commerce) and belongs to the actor. */
export function assertOrderOwned(
  order: OrderPersonalizationContext | undefined,
  customerIdentityId: string,
): OrderPersonalizationContext {
  if (order === undefined) {
    throw soundwaveUploadErrors.notFound(SoundwaveUploadReason.ORDER_NOT_FOUND);
  }
  if (
    order.ownerCustomerIdentityId.toLowerCase() !==
    customerIdentityId.toLowerCase()
  ) {
    throw soundwaveUploadErrors.forbidden(
      SoundwaveUploadReason.ORDER_NOT_OWNED,
    );
  }
  return order;
}

/**
 * Same checks, same reasons as fingerprint capture, for a SOUNDWAVE_PROCESSING consent:
 * consent of this order and actor, ACCEPTED, right type, P1 paid, every consent item is
 * still a SOUNDWAVE package. Whether the consent already has a source is checked by the
 * caller (it differs between initiate and complete).
 */
export function assertConsentUsable(
  order: OrderPersonalizationContext,
  consent: UploadConsentRecord | undefined,
  orderId: string,
  customerIdentityId: string,
): UploadConsentRecord {
  if (
    consent === undefined ||
    consent.orderId.toLowerCase() !== orderId ||
    consent.customerIdentityId.toLowerCase() !==
      customerIdentityId.toLowerCase()
  ) {
    throw soundwaveUploadErrors.notFound(
      SoundwaveUploadReason.CONSENT_NOT_FOUND,
    );
  }
  if (consent.status !== 'ACCEPTED') {
    throw soundwaveUploadErrors.precondition(
      SoundwaveUploadReason.CONSENT_NOT_ACCEPTED,
    );
  }
  if (consent.consentType !== SOUNDWAVE_CONSENT_TYPE) {
    throw soundwaveUploadErrors.precondition(
      SoundwaveUploadReason.CONSENT_TYPE_MISMATCH,
    );
  }
  if (!order.p1Paid) {
    throw soundwaveUploadErrors.precondition(SoundwaveUploadReason.P1_NOT_PAID);
  }
  const orderItems = new Map(
    order.ringItems.map((item) => [item.ringItemId.toLowerCase(), item]),
  );
  const everyItemStillSoundwave =
    consent.ringItemIds.length > 0 &&
    consent.ringItemIds.every(
      (id) =>
        orderItems.get(id.toLowerCase())?.personalizationPackage ===
        SOUNDWAVE_PACKAGE,
    );
  if (!everyItemStillSoundwave) {
    throw soundwaveUploadErrors.precondition(
      SoundwaveUploadReason.PACKAGE_MISMATCH,
    );
  }
  return consent;
}
