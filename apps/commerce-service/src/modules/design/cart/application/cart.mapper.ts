import type {
  CartItemDraft,
  GemstoneSelectionItem,
  GetCartResponse,
} from '@app/contracts';
import type { CartDraftRecord, CartRecord } from './cart.repository';

function isGemstoneSelectionItem(item: unknown): item is GemstoneSelectionItem {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false;
  }
  if (
    !('gemstoneOptionId' in item) ||
    typeof item.gemstoneOptionId !== 'string'
  ) {
    return false;
  }
  if (
    'slotIndex' in item &&
    item.slotIndex !== undefined &&
    typeof item.slotIndex !== 'number'
  ) {
    return false;
  }
  return true;
}

export function parseGemstoneSelections(
  json: unknown,
): GemstoneSelectionItem[] {
  if (Array.isArray(json)) {
    return json.filter(isGemstoneSelectionItem);
  }
  if (
    json &&
    typeof json === 'object' &&
    'selections' in json &&
    Array.isArray(json.selections)
  ) {
    return json.selections.filter(isGemstoneSelectionItem);
  }
  return [];
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
): object {
  return maintenancePlan !== 'NONE'
    ? { selections, maintenancePlan }
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
