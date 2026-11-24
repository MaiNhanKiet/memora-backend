import { CONSENT_TYPES, type ConsentType } from '@app/contracts';
import { consentErrors, ConsentReason } from './consent.errors';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string | undefined, reason: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw consentErrors.invalid(reason);
  }
  return value.toLowerCase();
}

export function requireConsentType(value: string | undefined): ConsentType {
  if (!CONSENT_TYPES.includes(value as ConsentType)) {
    throw consentErrors.invalid(ConsentReason.INVALID_CONSENT_TYPE);
  }
  return value as ConsentType;
}

export function requirePolicyVersion(value: string | undefined): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 50) {
    throw consentErrors.invalid(ConsentReason.INVALID_POLICY_VERSION);
  }
  return value;
}

/** 1..2 unique uuids, lower-cased. */
export function requireRingItemIds(
  values: readonly string[] | undefined,
): string[] {
  const ids = (values ?? []).map((value) =>
    requireUuid(value, ConsentReason.INVALID_RING_ITEM_IDS),
  );
  if (ids.length < 1 || ids.length > 2 || new Set(ids).size !== ids.length) {
    throw consentErrors.invalid(ConsentReason.INVALID_RING_ITEM_IDS);
  }
  return ids;
}
