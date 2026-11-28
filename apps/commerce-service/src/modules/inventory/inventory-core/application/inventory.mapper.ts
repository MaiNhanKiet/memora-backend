import type {
  AllocationResponse,
  CertifiedGemstoneResponse,
  InventoryMovementResponse,
  StockLotResponse,
} from '@app/contracts';
import type {
  AllocationRecord,
  CertifiedGemstoneRecord,
  InventoryMovementRecord,
  StockLotRecord,
} from './inventory.repository';

export function parseJsonRecord(raw?: string): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function toStockLotResponse(lot: StockLotRecord): StockLotResponse {
  return {
    id: lot.id,
    stockCode: lot.stockCode,
    stockType: lot.stockType,
    templateVariantId: lot.templateVariantId,
    gemstoneOptionId: lot.gemstoneOptionId,
    lotCode: lot.lotCode,
    supplierRef: lot.supplierRef,
    quantityOnHand: lot.quantityOnHand,
    quantityReserved: lot.quantityReserved,
    unitCost: lot.unitCost,
    locationCode: lot.locationCode,
    status: lot.status,
    receivedAt: lot.receivedAt?.toISOString(),
    updatedAt: lot.updatedAt.toISOString(),
  };
}

export function toCertifiedGemstoneResponse(
  gem: CertifiedGemstoneRecord,
): CertifiedGemstoneResponse {
  return {
    id: gem.id,
    internalCode: gem.internalCode,
    gemstoneOptionId: gem.gemstoneOptionId,
    certificateProvider: gem.certificateProvider,
    certificateNumber: gem.certificateNumber,
    certificateUrl: gem.certificateUrl,
    certificateMetadataJson: gem.certificateMetadataJson
      ? JSON.stringify(gem.certificateMetadataJson)
      : undefined,
    purchaseCost: gem.purchaseCost,
    status: gem.status,
    locationCode: gem.locationCode,
    receivedAt: gem.receivedAt?.toISOString(),
    updatedAt: gem.updatedAt.toISOString(),
  };
}

export function toInventoryMovementResponse(
  movement: InventoryMovementRecord,
): InventoryMovementResponse {
  return {
    id: movement.id,
    movementType: movement.movementType,
    stockLotId: movement.stockLotId,
    certifiedGemstoneId: movement.certifiedGemstoneId,
    allocationId: movement.allocationId,
    ringItemId: movement.ringItemId,
    productionAttemptId: movement.productionAttemptId,
    quantity: movement.quantity,
    unitCostSnapshot: movement.unitCostSnapshot,
    reason: movement.reason,
    performedByUserId: movement.performedByUserId,
    occurredAt: movement.occurredAt.toISOString(),
    metadataJson: movement.metadataJson
      ? JSON.stringify(movement.metadataJson)
      : undefined,
  };
}

export function toAllocationResponse(
  allocation: AllocationRecord,
): AllocationResponse {
  return {
    id: allocation.id,
    ringItemId: allocation.ringItemId,
    productionAttemptId: allocation.productionAttemptId,
    stockLotId: allocation.stockLotId,
    certifiedGemstoneId: allocation.certifiedGemstoneId,
    quantity: allocation.quantity,
    status: allocation.status,
    expiresAt: allocation.expiresAt?.toISOString(),
    allocatedByUserId: allocation.allocatedByUserId,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}
