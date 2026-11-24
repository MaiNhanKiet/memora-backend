import type { Consent } from '@app/contracts';
import type { ConsentRecord } from './consent.repository';

/** Record -> wire Consent. ISO-8601 UTC; revokedAt is omitted while ACCEPTED. */
export function toConsent(record: ConsentRecord): Consent {
  return {
    consentId: record.id,
    orderId: record.orderId,
    consentType: record.consentType,
    policyVersion: record.policyVersion,
    status: record.status,
    acceptedAt: record.acceptedAt.toISOString(),
    ...(record.revokedAt === null
      ? {}
      : { revokedAt: record.revokedAt.toISOString() }),
    ringItemIds: [...record.ringItemIds],
  };
}
