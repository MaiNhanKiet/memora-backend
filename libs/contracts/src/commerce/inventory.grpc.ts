// Contract gRPC của Commerce Inventory, khớp proto/commerce/v1/inventory.proto.

import type { Observable } from 'rxjs';
import type { Metadata } from '@grpc/grpc-js';
import type { VerifiedActor } from '../common/actor';

export interface StockLotResponse {
  id: string;
  stockCode: string;
  stockType: string;
  templateVariantId?: string;
  gemstoneOptionId?: string;
  lotCode?: string;
  supplierRef?: string;
  quantityOnHand: number;
  quantityReserved: number;
  unitCost?: number;
  locationCode?: string;
  status: string;
  receivedAt?: string;
  updatedAt: string;
}

// INVEN-001: List Ring Blank Stocks
export interface ListRingBlankStocksRequest {
  templateVariantId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListRingBlankStocksResponse {
  items: StockLotResponse[];
  total: number;
}

// INVEN-002: Receive Ring Blank Stock
export interface ReceiveRingBlankStockRequest {
  templateVariantId: string;
  lotCode?: string;
  supplierRef?: string;
  quantity: number;
  unitCost?: number;
  locationCode?: string;
  receivedAt?: string;
  performedByUserId?: string;
}

// INVEN-003: List Gemstone Batches
export interface ListGemstoneBatchesRequest {
  gemstoneOptionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListGemstoneBatchesResponse {
  items: StockLotResponse[];
  total: number;
}

// INVEN-004: Receive Gemstone Batch
export interface ReceiveGemstoneBatchRequest {
  gemstoneOptionId: string;
  lotCode?: string;
  supplierRef?: string;
  quantity: number;
  unitCost?: number;
  locationCode?: string;
  receivedAt?: string;
  performedByUserId?: string;
}

// INVEN-005 & INVEN-006: Certified Gemstones
export interface CertifiedGemstoneResponse {
  id: string;
  internalCode: string;
  gemstoneOptionId: string;
  certificateProvider?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  certificateMetadataJson?: string;
  purchaseCost?: number;
  status: string;
  locationCode?: string;
  receivedAt?: string;
  updatedAt: string;
}

export interface ListCertifiedGemstoneAvailabilityRequest {
  gemstoneOptionId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ListCertifiedGemstoneAvailabilityResponse {
  items: CertifiedGemstoneResponse[];
  total: number;
}

export interface CreateCertifiedGemstoneRequest {
  internalCode: string;
  gemstoneOptionId: string;
  certificateProvider?: string;
  certificateNumber?: string;
  certificateUrl?: string;
  certificateMetadataJson?: string;
  purchaseCost?: number;
  locationCode?: string;
  performedByUserId?: string;
}

// INVEN-012: Inventory Movements (Audit Ledger)
export interface InventoryMovementResponse {
  id: string;
  movementType: string;
  stockLotId?: string;
  certifiedGemstoneId?: string;
  allocationId?: string;
  ringItemId?: string;
  productionAttemptId?: string;
  quantity: number;
  unitCostSnapshot?: number;
  reason?: string;
  performedByUserId?: string;
  occurredAt: string;
  metadataJson?: string;
}

export interface ListInventoryMovementsRequest {
  stockLotId?: string;
  certifiedGemstoneId?: string;
  movementType?: string;
  limit?: number;
  offset?: number;
}

export interface ListInventoryMovementsResponse {
  items: InventoryMovementResponse[];
  total: number;
}

// INVEN-013: Adjust Inventory
export interface AdjustInventoryRequest {
  stockLotId: string;
  adjustedQuantity: number;
  reason: string;
  metadataJson?: string;
  performedByUserId?: string;
}

// -----------------------------------------------------------------------------
// Inventory Allocations & Stock Lifecycle (INVEN-007..011)
// -----------------------------------------------------------------------------

export interface AllocationResponse {
  id: string;
  ringItemId: string;
  productionAttemptId?: string;
  stockLotId?: string;
  certifiedGemstoneId?: string;
  quantity: number;
  status: string;
  expiresAt?: string;
  allocatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HoldInventoryRequest {
  actor: VerifiedActor;
  ringItemId: string;
  stockLotId?: string;
  certifiedGemstoneId?: string;
  quantity?: number;
  ttlMinutes?: number;
}

export interface ReserveInventoryRequest {
  actor: VerifiedActor;
  allocationId: string;
}

export interface AllocateInventoryRequest {
  actor: VerifiedActor;
  allocationId: string;
  productionAttemptId: string;
}

export interface ConsumeInventoryRequest {
  actor: VerifiedActor;
  allocationId: string;
}

export interface ReleaseInventoryRequest {
  actor: VerifiedActor;
  allocationId: string;
  reason?: string;
}

export interface InventoryServiceClient {
  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
    metadata?: Metadata,
  ): Observable<ListRingBlankStocksResponse>;

  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
    metadata?: Metadata,
  ): Observable<StockLotResponse>;

  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
    metadata?: Metadata,
  ): Observable<ListGemstoneBatchesResponse>;

  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
    metadata?: Metadata,
  ): Observable<StockLotResponse>;

  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
    metadata?: Metadata,
  ): Observable<ListCertifiedGemstoneAvailabilityResponse>;

  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
    metadata?: Metadata,
  ): Observable<CertifiedGemstoneResponse>;

  listInventoryMovements(
    request: ListInventoryMovementsRequest,
    metadata?: Metadata,
  ): Observable<ListInventoryMovementsResponse>;

  adjustInventory(
    request: AdjustInventoryRequest,
    metadata?: Metadata,
  ): Observable<StockLotResponse>;

  holdInventory(
    request: HoldInventoryRequest,
    metadata?: Metadata,
  ): Observable<AllocationResponse>;

  reserveInventory(
    request: ReserveInventoryRequest,
    metadata?: Metadata,
  ): Observable<AllocationResponse>;

  allocateInventory(
    request: AllocateInventoryRequest,
    metadata?: Metadata,
  ): Observable<AllocationResponse>;

  consumeInventory(
    request: ConsumeInventoryRequest,
    metadata?: Metadata,
  ): Observable<AllocationResponse>;

  releaseInventory(
    request: ReleaseInventoryRequest,
    metadata?: Metadata,
  ): Observable<AllocationResponse>;
}

export interface InventoryServiceHandler {
  listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse>;

  receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse>;

  listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse>;

  receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse>;

  listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse>;

  createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse>;

  listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse>;

  adjustInventory(request: AdjustInventoryRequest): Promise<StockLotResponse>;

  holdInventory(request: HoldInventoryRequest): Promise<AllocationResponse>;
  reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse>;
  allocateInventory(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse>;
  consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse>;
  releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse>;
}
