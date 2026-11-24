import type { Consent, ListConsentsResponse } from '@app/contracts';
import type {
  ConsentListResponseDto,
  ConsentResponseDto,
} from '../dto/consent.response.dto';

/** Explicit public mapping; an unset `revokedAt` becomes null. */
export function toConsentResponse(consent: Consent): ConsentResponseDto {
  const revokedAt: string | null | undefined = consent.revokedAt;
  return {
    consentId: consent.consentId,
    orderId: consent.orderId,
    consentType: consent.consentType,
    policyVersion: consent.policyVersion,
    status: consent.status,
    acceptedAt: consent.acceptedAt,
    revokedAt:
      revokedAt === undefined || revokedAt === null || revokedAt === ''
        ? null
        : revokedAt,
    ringItemIds: consent.ringItemIds,
  };
}

export function toConsentListResponse(
  response: ListConsentsResponse,
): ConsentListResponseDto {
  return { items: response.items.map(toConsentResponse) };
}
