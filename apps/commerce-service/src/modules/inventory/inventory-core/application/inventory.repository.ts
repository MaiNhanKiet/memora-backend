export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY');

export interface StockLotRecord {
  readonly id: string;
  readonly stockCode: string;
  readonly stockType: string;
  readonly templateVariantId?: string;
  readonly gemstoneOptionId?: string;
  readonly lotCode?: string;
  readonly supplierRef?: string;
  readonly quantityOnHand: number;
  readonly quantityReserved: number;
  readonly unitCost?: number;
  readonly locationCode?: string;
  readonly status: string;
  readonly receivedAt?: Date;
  readonly updatedAt: Date;
}

export interface CertifiedGemstoneRecord {
  readonly id: string;
  readonly internalCode: string;
  readonly gemstoneOptionId: string;
  readonly certificateProvider?: string;
  readonly certificateNumber?: string;
  readonly certificateUrl?: string;
  readonly certificateMetadataJson?: unknown;
  readonly purchaseCost?: number;
  readonly status: string;
  readonly locationCode?: string;
  readonly receivedAt?: Date;
  readonly updatedAt: Date;
}

export interface InventoryMovementRecord {
  readonly id: string;
  readonly movementType: string;
  readonly stockLotId?: string;
  readonly certifiedGemstoneId?: string;
  readonly allocationId?: string;
  readonly ringItemId?: string;
  readonly productionAttemptId?: string;
  readonly quantity: number;
  readonly unitCostSnapshot?: number;
  readonly reason?: string;
  readonly performedByUserId?: string;
  readonly occurredAt: Date;
  readonly metadataJson?: unknown;
}

export interface AllocationRecord {
  readonly id: string;
  readonly ringItemId: string;
  readonly productionAttemptId?: string;
  readonly stockLotId?: string;
  readonly certifiedGemstoneId?: string;
  readonly quantity: number;
  readonly status: string;
  readonly expiresAt?: Date;
  readonly allocatedByUserId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface InventoryRepository {
  findRingBlankStocks(filter: {
    templateVariantId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: StockLotRecord[]; total: number }>;

  receiveRingBlankStock(params: {
    templateVariantId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<StockLotRecord>;

  findGemstoneBatches(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: StockLotRecord[]; total: number }>;

  receiveGemstoneBatch(params: {
    gemstoneOptionId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<StockLotRecord>;

  findCertifiedGemstoneAvailability(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: CertifiedGemstoneRecord[]; total: number }>;

  findCertifiedGemstoneByCode(
    internalCode: string,
  ): Promise<CertifiedGemstoneRecord | null>;

  createCertifiedGemstone(params: {
    internalCode: string;
    gemstoneOptionId: string;
    certificateProvider?: string;
    certificateNumber?: string;
    certificateUrl?: string;
    certificateMetadataJson?: Record<string, unknown>;
    purchaseCost?: number;
    locationCode?: string;
    performedByUserId?: string;
  }): Promise<CertifiedGemstoneRecord>;

  findInventoryMovements(filter: {
    stockLotId?: string;
    certifiedGemstoneId?: string;
    movementType?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: InventoryMovementRecord[]; total: number }>;

  adjustInventory(params: {
    stockLotId: string;
    adjustedQuantity: number;
    reason: string;
    metadataJson?: Record<string, unknown>;
    performedByUserId?: string;
  }): Promise<StockLotRecord>;

  holdInventory(params: {
    ringItemId: string;
    stockLotId?: string;
    certifiedGemstoneId?: string;
    quantity: number;
    expiresAt: Date;
    allocatedByUserId: string;
  }): Promise<AllocationRecord>;

  reserveInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord>;

  allocateInventory(params: {
    allocationId: string;
    productionAttemptId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord>;

  consumeInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord>;

  releaseInventory(params: {
    allocationId: string;
    reason?: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord>;
}
