import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client';
import type {
  AdjustInventoryRequest,
  CertifiedGemstoneResponse,
  CreateCertifiedGemstoneRequest,
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
}
