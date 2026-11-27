import type {
  CartItemDraft,
  GemstoneSelectionItem,
  GetCartResponse,
} from '@app/contracts';
import type { CartDraftRecord, CartRecord } from './cart.repository';

function parseGemstoneSelection(
  item: unknown,
): GemstoneSelectionItem | undefined {
  if (!item || typeof item !== 'object' || Array.isArray(item))
    return undefined;

  const optionId =
    'gemstoneOptionId' in item
      ? item.gemstoneOptionId
      : 'gemstone_option_id' in item
        ? item.gemstone_option_id
        : undefined;
  const slot =
    'slotNumber' in item
      ? item.slotNumber
      : 'slot_number' in item
        ? item.slot_number
        : 'slotIndex' in item
          ? item.slotIndex
          : undefined;
  const certifiedId =
    'certifiedGemstoneId' in item ? item.certifiedGemstoneId : undefined;
  if (
    typeof optionId !== 'string' ||
    typeof slot !== 'number' ||
    !Number.isInteger(slot) ||
    (certifiedId !== undefined && typeof certifiedId !== 'string')
  ) {
    return undefined;
  }
  return {
    gemstoneOptionId: optionId,
    slotNumber: slot,
    ...(certifiedId ? { certifiedGemstoneId: certifiedId } : {}),
  };
}

export function parseGemstoneSelections(
  json: unknown,
): GemstoneSelectionItem[] {
  const selections: unknown = Array.isArray(json)
    ? json
    : json && typeof json === 'object' && 'selections' in json
      ? json.selections
      : undefined;
  if (!Array.isArray(selections)) return [];
  return selections.flatMap((item: unknown) => {
    const selection = parseGemstoneSelection(item);
    return selection ? [selection] : [];
  });
}

export function extractCertifiedPriceVersionIds(json: unknown): string[] {
  const ids: unknown =
    json && typeof json === 'object' && 'certifiedPriceVersionIds' in json
      ? json.certifiedPriceVersionIds
      : undefined;
  return Array.isArray(ids)
    ? ids.filter((id: unknown): id is string => typeof id === 'string')
    : [];
}

export function extractMaintenancePlan(json: unknown): string | undefined {
  if (
    json &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    'maintenancePlan' in json &&
    typeof json.maintenancePlan === 'string'
  ) {
    return json.maintenancePlan;
  }
  return undefined;
}

export function buildGemstoneConfigJson(
  selections: GemstoneSelectionItem[],
  maintenancePlan: string,
  certifiedPriceVersionIds: string[] = [],
): object {
  return maintenancePlan !== 'NONE' || certifiedPriceVersionIds.length > 0
    ? { selections, maintenancePlan, certifiedPriceVersionIds }
    : selections;
}

export function mapDraftItem(draft: CartDraftRecord): CartItemDraft {
  const selections = parseGemstoneSelections(draft.gemstoneConfigJson);
  const maintenancePlan = extractMaintenancePlan(draft.gemstoneConfigJson);

  return {
    draftId: draft.id,
    templateVariantId: draft.templateVariantId,
    templateCode: draft.variant?.templateCode ?? '',
    templateName: draft.variant?.templateName ?? '',
    materialName: draft.variant?.materialName ?? '',
    standardSize: draft.variant?.standardSize ?? 0,
    targetSize: draft.targetSize,
    personalizationPackage: draft.personalizationPackage,
    memoryEnabled: draft.memoryEnabled,
    maintenancePlan,
    gemstoneSelections: selections,
    estimatedPrice: draft.estimatedPrice,
    currency: draft.currency,
    estimatedPriceAt: draft.estimatedPriceAt
      ? draft.estimatedPriceAt.toISOString()
      : '',
    status: draft.status,
    createdAt: draft.createdAt.toISOString(),
  };
}

export function mapCartResponse(cart: CartRecord): GetCartResponse {
  const items = cart.drafts.map((d) => mapDraftItem(d));
  const totalEstimatedPrice = items.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0),
    0,
  );

  return {
    id: cart.id,
    status: cart.status,
    itemsCount: items.length,
    totalEstimatedPrice,
    currency: 'VND',
    expiresAt: cart.expiresAt ? cart.expiresAt.toISOString() : undefined,
    items,
  };
}
