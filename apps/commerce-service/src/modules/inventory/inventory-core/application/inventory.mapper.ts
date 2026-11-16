import { Injectable } from '@nestjs/common';
import type {
  allocations,
  certified_gemstones,
  inventory_movements,
  stock_lots,
} from '../../../../../generated/prisma/client';
import type {
  AllocationResponse,
  CertifiedGemstoneResponse,
  InventoryMovementResponse,
  StockLotResponse,
} from '@app/contracts';

@Injectable()
export class InventoryMapper {
  toStockLotResponse(lot: stock_lots): StockLotResponse {
    return {
      id: lot.id,
      stockCode: lot.stock_code,
      stockType: lot.stock_type,
      templateVariantId: lot.template_variant_id ?? undefined,
      gemstoneOptionId: lot.gemstone_option_id ?? undefined,
      lotCode: lot.lot_code ?? undefined,
      supplierRef: lot.supplier_ref ?? undefined,
      quantityOnHand: lot.quantity_on_hand,
      quantityReserved: lot.quantity_reserved,
      unitCost: lot.unit_cost !== null ? Number(lot.unit_cost) : undefined,
      locationCode: lot.location_code ?? undefined,
      status: lot.status,
      receivedAt: lot.received_at?.toISOString(),
      updatedAt: lot.updated_at.toISOString(),
    };
  }

  toCertifiedGemstoneResponse(
    gem: certified_gemstones,
  ): CertifiedGemstoneResponse {
    return {
      id: gem.id,
      internalCode: gem.internal_code,
      gemstoneOptionId: gem.gemstone_option_id,
      certificateProvider: gem.certificate_provider ?? undefined,
      certificateNumber: gem.certificate_number ?? undefined,
      certificateUrl: gem.certificate_url ?? undefined,
      certificateMetadataJson: gem.certificate_metadata_json
        ? JSON.stringify(gem.certificate_metadata_json)
        : undefined,
      purchaseCost:
        gem.purchase_cost !== null ? Number(gem.purchase_cost) : undefined,
      status: gem.status,
      locationCode: gem.location_code ?? undefined,
      receivedAt: gem.received_at?.toISOString(),
      updatedAt: gem.updated_at.toISOString(),
    };
  }

  toInventoryMovementResponse(
    movement: inventory_movements,
  ): InventoryMovementResponse {
    return {
      id: movement.id,
      movementType: movement.movement_type,
      stockLotId: movement.stock_lot_id ?? undefined,
      certifiedGemstoneId: movement.certified_gemstone_id ?? undefined,
      allocationId: movement.allocation_id ?? undefined,
      ringItemId: movement.ring_item_id ?? undefined,
      productionAttemptId: movement.production_attempt_id ?? undefined,
      quantity: movement.quantity,
      unitCostSnapshot:
        movement.unit_cost_snapshot !== null
          ? Number(movement.unit_cost_snapshot)
          : undefined,
      reason: movement.reason ?? undefined,
      performedByUserId: movement.performed_by_user_id ?? undefined,
      occurredAt: movement.occurred_at.toISOString(),
      metadataJson: movement.metadata_json
        ? JSON.stringify(movement.metadata_json)
        : undefined,
    };
  }

  toAllocationResponse(allocation: allocations): AllocationResponse {
    return {
      id: allocation.id,
      ringItemId: allocation.ring_item_id,
      productionAttemptId: allocation.production_attempt_id ?? undefined,
      stockLotId: allocation.stock_lot_id ?? undefined,
      certifiedGemstoneId: allocation.certified_gemstone_id ?? undefined,
      quantity: allocation.quantity,
      status: allocation.status,
      expiresAt: allocation.expires_at?.toISOString(),
      allocatedByUserId: allocation.allocated_by_user_id ?? undefined,
      createdAt: allocation.created_at.toISOString(),
      updatedAt: allocation.updated_at.toISOString(),
    };
  }
}
