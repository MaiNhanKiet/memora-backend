import type {
  ListOrderSourcesResponse,
  PersonalizationSource,
} from '@app/contracts';
import type { PersonalizationSourceResponseDto } from '../dto/personalization-source.response.dto';

function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

/** Explicit public mapping; unset optional fields become null. No keys, checksums or metadata. */
export function toPersonalizationSourceResponse(
  source: PersonalizationSource,
): PersonalizationSourceResponseDto {
  return {
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    status: source.status,
    failureCode: emptyToNull(source.failureCode),
    acceptedAt: emptyToNull(source.acceptedAt),
    ringItemIds: source.ringItemIds,
    bindingMode: emptyToNull(source.bindingMode),
  };
}

export function toPersonalizationSourceListResponse(
  response: ListOrderSourcesResponse,
): PersonalizationSourceResponseDto[] {
  return response.items.map(toPersonalizationSourceResponse);
}
