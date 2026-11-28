import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  AdjustInventoryRequest,
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
import {
  parseJsonRecord,
  toInventoryMovementResponse,
  toStockLotResponse,
} from './inventory.mapper';
import {
  INVENTORY_REPOSITORY,
  type InventoryRepository,
} from './inventory.repository';

@Injectable()
export class ListRingBlankStocksUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
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
      items: items.map((lot) => toStockLotResponse(lot)),
      total,
    };
  }
}

@Injectable()
export class ReceiveRingBlankStockUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
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

    return toStockLotResponse(created);
  }
}

@Injectable()
export class ListGemstoneBatchesUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
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
      items: items.map((lot) => toStockLotResponse(lot)),
      total,
    };
  }
}

@Injectable()
export class ReceiveGemstoneBatchUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
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

    return toStockLotResponse(created);
  }
}

@Injectable()
export class ListInventoryMovementsUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(
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
      items: items.map((m) => toInventoryMovementResponse(m)),
      total,
    };
  }
}

@Injectable()
export class AdjustInventoryUseCase {
  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: InventoryRepository,
  ) {}

  async execute(request: AdjustInventoryRequest): Promise<StockLotResponse> {
    if (request.adjustedQuantity === 0) {
      throw new UnprocessableEntityException('Adjusted quantity cannot be 0');
    }

    const parsedMetadata = parseJsonRecord(request.metadataJson);

    try {
      const updated = await this.repository.adjustInventory({
        stockLotId: request.stockLotId,
        adjustedQuantity: request.adjustedQuantity,
        reason: request.reason,
        metadataJson: parsedMetadata,
        performedByUserId: request.performedByUserId,
      });

      return toStockLotResponse(updated);
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
