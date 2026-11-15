import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { parseVerifiedActor, requireUserActor } from '@app/common';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  AdjustInventoryRequest,
  AllocateInventoryRequest,
  AllocationResponse,
  CertifiedGemstoneResponse,
  ConsumeInventoryRequest,
  CreateCertifiedGemstoneRequest,
  HoldInventoryRequest,
  ListCertifiedGemstoneAvailabilityRequest,
  ListCertifiedGemstoneAvailabilityResponse,
  ListGemstoneBatchesRequest,
  ListGemstoneBatchesResponse,
  ListInventoryMovementsRequest,
  ListInventoryMovementsResponse,
  ListRingBlankStocksRequest,
  ListRingBlankStocksResponse,
  ReceiveGemstoneBatchRequest,
  ReceiveRingBlankStockRequest,
  ReleaseInventoryRequest,
  ReserveInventoryRequest,
  StockLotResponse,
} from '@app/contracts';
import { InventoryRepository } from '../../repositories/inventory.repository';
import { InventoryMapper } from './inventory.mapper';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly mapper: InventoryMapper,
  ) {}

  // --- INVEN-001: List Ring Blank Stocks ---
  async listRingBlankStocks(
    request: ListRingBlankStocksRequest,
  ): Promise<ListRingBlankStocksResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } = await this.repository.findRingBlankStocks({
      templateVariantId: request.templateVariantId,
      status: request.status,
      limit,
      offset,
    });

    return {
      items: items.map((lot) => this.mapper.toStockLotResponse(lot)),
      total,
    };
  }

  // --- INVEN-002: Receive Ring Blank Stock ---
  async receiveRingBlankStock(
    request: ReceiveRingBlankStockRequest,
  ): Promise<StockLotResponse> {
    if (request.quantity <= 0) {
      throw new UnprocessableEntityException('Quantity must be greater than 0');
    }

    const created = await this.repository.receiveRingBlankStock({
      templateVariantId: request.templateVariantId,
      lotCode: request.lotCode,
      supplierRef: request.supplierRef,
      quantity: request.quantity,
      unitCost: request.unitCost,
      locationCode: request.locationCode,
      receivedAt: request.receivedAt ? new Date(request.receivedAt) : undefined,
      performedByUserId: request.performedByUserId,
    });

    return this.mapper.toStockLotResponse(created);
  }

  // --- INVEN-003: List Gemstone Batches ---
  async listGemstoneBatches(
    request: ListGemstoneBatchesRequest,
  ): Promise<ListGemstoneBatchesResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } = await this.repository.findGemstoneBatches({
      gemstoneOptionId: request.gemstoneOptionId,
      status: request.status,
      limit,
      offset,
    });

    return {
      items: items.map((lot) => this.mapper.toStockLotResponse(lot)),
      total,
    };
  }

  // --- INVEN-004: Receive Gemstone Batch ---
  async receiveGemstoneBatch(
    request: ReceiveGemstoneBatchRequest,
  ): Promise<StockLotResponse> {
    if (request.quantity <= 0) {
      throw new UnprocessableEntityException('Quantity must be greater than 0');
    }

    const created = await this.repository.receiveGemstoneBatch({
      gemstoneOptionId: request.gemstoneOptionId,
      lotCode: request.lotCode,
      supplierRef: request.supplierRef,
      quantity: request.quantity,
      unitCost: request.unitCost,
      locationCode: request.locationCode,
      receivedAt: request.receivedAt ? new Date(request.receivedAt) : undefined,
      performedByUserId: request.performedByUserId,
    });

    return this.mapper.toStockLotResponse(created);
  }

  // --- INVEN-005: List Certified Gemstones Availability ---
  async listCertifiedGemstoneAvailability(
    request: ListCertifiedGemstoneAvailabilityRequest,
  ): Promise<ListCertifiedGemstoneAvailabilityResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } =
      await this.repository.findCertifiedGemstoneAvailability({
        gemstoneOptionId: request.gemstoneOptionId,
        status: request.status ?? 'AVAILABLE',
        limit,
        offset,
      });

    return {
      items: items.map((gem) => this.mapper.toCertifiedGemstoneResponse(gem)),
      total,
    };
  }

  // --- INVEN-006: Create Certified Gemstone ---
  async createCertifiedGemstone(
    request: CreateCertifiedGemstoneRequest,
  ): Promise<CertifiedGemstoneResponse> {
    const existing = await this.repository.findCertifiedGemstoneByCode(
      request.internalCode,
    );
    if (existing) {
      throw new ConflictException(
        `Certified gemstone with internal code '${request.internalCode}' already exists`,
      );
    }

    let parsedMetadata: Prisma.InputJsonValue = {};
    if (request.certificateMetadataJson) {
      try {
        parsedMetadata = JSON.parse(
          request.certificateMetadataJson,
        ) as Prisma.InputJsonValue;
      } catch {
        parsedMetadata = {};
      }
    }

    const created = await this.repository.createCertifiedGemstone({
      internalCode: request.internalCode,
      gemstoneOptionId: request.gemstoneOptionId,
      certificateProvider: request.certificateProvider,
      certificateNumber: request.certificateNumber,
      certificateUrl: request.certificateUrl,
      certificateMetadataJson: parsedMetadata,
      purchaseCost: request.purchaseCost,
      locationCode: request.locationCode,
      performedByUserId: request.performedByUserId,
    });

    return this.mapper.toCertifiedGemstoneResponse(created);
  }

  // --- INVEN-012: List Inventory Movements (Audit Ledger) ---
  async listInventoryMovements(
    request: ListInventoryMovementsRequest,
  ): Promise<ListInventoryMovementsResponse> {
    const limit = request.limit && request.limit > 0 ? request.limit : 20;
    const offset = request.offset && request.offset >= 0 ? request.offset : 0;

    const { items, total } = await this.repository.findInventoryMovements({
      stockLotId: request.stockLotId,
      certifiedGemstoneId: request.certifiedGemstoneId,
      movementType: request.movementType,
      limit,
      offset,
    });

    return {
      items: items.map((m) => this.mapper.toInventoryMovementResponse(m)),
      total,
    };
  }

  // --- INVEN-013: Adjust Inventory ---
  async adjustInventory(
    request: AdjustInventoryRequest,
  ): Promise<StockLotResponse> {
    if (request.adjustedQuantity === 0) {
      throw new UnprocessableEntityException('Adjusted quantity cannot be 0');
    }

    let parsedMetadata: Prisma.InputJsonValue = {};
    if (request.metadataJson) {
      try {
        parsedMetadata = JSON.parse(
          request.metadataJson,
        ) as Prisma.InputJsonValue;
      } catch {
        parsedMetadata = {};
      }
    }

    try {
      const updated = await this.repository.adjustInventory({
        stockLotId: request.stockLotId,
        adjustedQuantity: request.adjustedQuantity,
        reason: request.reason,
        metadataJson: parsedMetadata,
        performedByUserId: request.performedByUserId,
      });

      return this.mapper.toStockLotResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'STOCK_LOT_NOT_FOUND') {
          throw new NotFoundException(
            `Stock lot ${request.stockLotId} not found`,
          );
        }
        if (error.message === 'STOCK_INSUFFICIENT') {
          throw new UnprocessableEntityException(
            'Adjustment would result in negative or reserved-violating inventory',
          );
        }
      }
      throw error;
    }
  }

  // --- INVEN-007: Hold Inventory ---
  async holdInventory(
    request: HoldInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    if (!request.stockLotId && !request.certifiedGemstoneId) {
      throw new BadRequestException(
        'Either stockLotId or certifiedGemstoneId must be provided',
      );
    }

    const quantity = request.quantity && request.quantity > 0 ? request.quantity : 1;
    const ttlMinutes =
      request.ttlMinutes && request.ttlMinutes > 0 ? request.ttlMinutes : 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    try {
      const created = await this.repository.holdInventory({
        ringItemId: request.ringItemId,
        stockLotId: request.stockLotId,
        certifiedGemstoneId: request.certifiedGemstoneId,
        quantity,
        expiresAt,
        allocatedByUserId: actor.userId,
      });

      return this.mapper.toAllocationResponse(created);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'STOCK_LOT_NOT_FOUND' ||
          error.message === 'CERTIFIED_GEMSTONE_NOT_FOUND'
        ) {
          throw new NotFoundException(error.message);
        }
        if (
          error.message === 'STOCK_INSUFFICIENT' ||
          error.message === 'GEMSTONE_NOT_AVAILABLE'
        ) {
          throw new ConflictException(error.message);
        }
      }
      throw error;
    }
  }

  // --- INVEN-008: Reserve Inventory ---
  async reserveInventory(
    request: ReserveInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.reserveInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return this.mapper.toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation can only be reserved from HOLD status',
          );
        }
      }
      throw error;
    }
  }

  // --- INVEN-009: Allocate Inventory ---
  async allocateInventory(
    request: AllocateInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));
    if (!request.productionAttemptId) {
      throw new BadRequestException('productionAttemptId is required');
    }

    try {
      const updated = await this.repository.allocateInventory({
        allocationId: request.allocationId,
        productionAttemptId: request.productionAttemptId,
        allocatedByUserId: actor.userId,
      });

      return this.mapper.toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation must be in HOLD or RESERVED status to allocate',
          );
        }
      }
      throw error;
    }
  }

  // --- INVEN-010: Consume Inventory ---
  async consumeInventory(
    request: ConsumeInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.consumeInventory({
        allocationId: request.allocationId,
        allocatedByUserId: actor.userId,
      });

      return this.mapper.toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Allocation must be in ALLOCATED status to consume',
          );
        }
      }
      throw error;
    }
  }

  // --- INVEN-011: Release Inventory ---
  async releaseInventory(
    request: ReleaseInventoryRequest,
  ): Promise<AllocationResponse> {
    const actor = requireUserActor(parseVerifiedActor(request.actor));

    try {
      const updated = await this.repository.releaseInventory({
        allocationId: request.allocationId,
        reason: request.reason,
        allocatedByUserId: actor.userId,
      });

      return this.mapper.toAllocationResponse(updated);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'ALLOCATION_NOT_FOUND') {
          throw new NotFoundException(error.message);
        }
        if (error.message === 'INVALID_ALLOCATION_STATUS') {
          throw new BadRequestException(
            'Cannot release already consumed or released allocation',
          );
        }
      }
      throw error;
    }
  }
}
