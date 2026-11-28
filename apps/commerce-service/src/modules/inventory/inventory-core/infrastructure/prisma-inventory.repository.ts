import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../../generated/prisma/client';
import type {
  allocations,
  certified_gemstones,
  inventory_movements,
  stock_lots,
} from '../../../../../generated/prisma/client';
import { PrismaService } from '../../../../persistence/prisma/prisma.service';
import type {
  AllocationRecord,
  CertifiedGemstoneRecord,
  InventoryMovementRecord,
  InventoryRepository,
  StockLotRecord,
} from '../application/inventory.repository';

import {
  availableCertifiedGemstones,
  lockAllocationGemstone,
  recordCertifiedRelease,
  restoreCertifiedAvailability,
  setCertifiedGemstoneAssignments,
} from './prisma-certified-gemstone-allocations';
import {
  lockAllocationStockLot,
  lockStockLots,
  releaseStockLotAllocation,
} from './prisma-stock-lot-allocations';

function toStockLotRecord(lot: stock_lots): StockLotRecord {
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
    receivedAt: lot.received_at ?? undefined,
    updatedAt: lot.updated_at,
  };
}

function toCertifiedGemstoneRecord(
  gem: certified_gemstones,
): CertifiedGemstoneRecord {
  return {
    id: gem.id,
    internalCode: gem.internal_code,
    gemstoneOptionId: gem.gemstone_option_id,
    certificateProvider: gem.certificate_provider ?? undefined,
    certificateNumber: gem.certificate_number ?? undefined,
    certificateUrl: gem.certificate_url ?? undefined,
    certificateMetadataJson: gem.certificate_metadata_json ?? undefined,
    purchaseCost:
      gem.purchase_cost !== null ? Number(gem.purchase_cost) : undefined,
    status: gem.status,
    locationCode: gem.location_code ?? undefined,
    receivedAt: gem.received_at ?? undefined,
    updatedAt: gem.updated_at,
  };
}

function toInventoryMovementRecord(
  m: inventory_movements,
): InventoryMovementRecord {
  return {
    id: m.id,
    movementType: m.movement_type,
    stockLotId: m.stock_lot_id ?? undefined,
    certifiedGemstoneId: m.certified_gemstone_id ?? undefined,
    allocationId: m.allocation_id ?? undefined,
    ringItemId: m.ring_item_id ?? undefined,
    productionAttemptId: m.production_attempt_id ?? undefined,
    quantity: m.quantity,
    unitCostSnapshot:
      m.unit_cost_snapshot !== null ? Number(m.unit_cost_snapshot) : undefined,
    reason: m.reason ?? undefined,
    performedByUserId: m.performed_by_user_id ?? undefined,
    occurredAt: m.occurred_at,
    metadataJson: m.metadata_json ?? undefined,
  };
}

function toAllocationRecord(a: allocations): AllocationRecord {
  return {
    id: a.id,
    ringItemId: a.ring_item_id,
    productionAttemptId: a.production_attempt_id ?? undefined,
    stockLotId: a.stock_lot_id ?? undefined,
    certifiedGemstoneId: a.certified_gemstone_id ?? undefined,
    quantity: a.quantity,
    status: a.status,
    expiresAt: a.expires_at ?? undefined,
    allocatedByUserId: a.allocated_by_user_id ?? undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

@Injectable()
export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRingBlankStocks(filter: {
    templateVariantId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: StockLotRecord[]; total: number }> {
    const where: Prisma.stock_lotsWhereInput = {
      stock_type: 'RING_BLANK',
      ...(filter.templateVariantId
        ? { template_variant_id: filter.templateVariantId }
        : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stock_lots.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.stock_lots.count({ where }),
    ]);

    return { items: items.map((l) => toStockLotRecord(l)), total };
  }

  async receiveRingBlankStock(params: {
    templateVariantId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<StockLotRecord> {
    const stockCode = `RB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const row = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const stockLot = await tx.stock_lots.create({
        data: {
          id: randomUUID(),
          stock_code: stockCode,
          stock_type: 'RING_BLANK',
          template_variant_id: params.templateVariantId,
          lot_code: params.lotCode,
          supplier_ref: params.supplierRef,
          quantity_on_hand: params.quantity,
          quantity_reserved: 0,
          unit_cost: params.unitCost !== undefined ? params.unitCost : null,
          location_code: params.locationCode,
          status: 'ACTIVE',
          received_at: params.receivedAt ?? now,
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'RECEIVE',
          stock_lot_id: stockLot.id,
          quantity: params.quantity,
          unit_cost_snapshot:
            params.unitCost !== undefined ? params.unitCost : null,
          reason: 'Initial ring blank receipt',
          performed_by_user_id: params.performedByUserId ?? null,
          occurred_at: now,
        },
      });

      return stockLot;
    });

    return toStockLotRecord(row);
  }

  async findGemstoneBatches(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: StockLotRecord[]; total: number }> {
    const where: Prisma.stock_lotsWhereInput = {
      stock_type: 'GEMSTONE',
      ...(filter.gemstoneOptionId
        ? { gemstone_option_id: filter.gemstoneOptionId }
        : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.stock_lots.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.stock_lots.count({ where }),
    ]);

    return { items: items.map((l) => toStockLotRecord(l)), total };
  }

  async receiveGemstoneBatch(params: {
    gemstoneOptionId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<StockLotRecord> {
    const stockCode = `GEM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const row = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const stockLot = await tx.stock_lots.create({
        data: {
          id: randomUUID(),
          stock_code: stockCode,
          stock_type: 'GEMSTONE',
          gemstone_option_id: params.gemstoneOptionId,
          lot_code: params.lotCode,
          supplier_ref: params.supplierRef,
          quantity_on_hand: params.quantity,
          quantity_reserved: 0,
          unit_cost: params.unitCost !== undefined ? params.unitCost : null,
          location_code: params.locationCode,
          status: 'ACTIVE',
          received_at: params.receivedAt ?? now,
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'RECEIVE',
          stock_lot_id: stockLot.id,
          quantity: params.quantity,
          unit_cost_snapshot:
            params.unitCost !== undefined ? params.unitCost : null,
          reason: 'Initial gemstone batch receipt',
          performed_by_user_id: params.performedByUserId ?? null,
          occurred_at: now,
        },
      });

      return stockLot;
    });

    return toStockLotRecord(row);
  }

  async findCertifiedGemstoneAvailability(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: CertifiedGemstoneRecord[]; total: number }> {
    const where: Prisma.certified_gemstonesWhereInput = {
      ...(filter.gemstoneOptionId
        ? { gemstone_option_id: filter.gemstoneOptionId }
        : {}),
      ...(filter.status === 'AVAILABLE'
        ? availableCertifiedGemstones(new Date())
        : filter.status
          ? { status: filter.status }
          : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.certified_gemstones.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.certified_gemstones.count({ where }),
    ]);

    return {
      items: items.map((g) =>
        toCertifiedGemstoneRecord(
          filter.status === 'AVAILABLE' ? { ...g, status: 'AVAILABLE' } : g,
        ),
      ),
      total,
    };
  }

  async findCertifiedGemstoneByCode(
    internalCode: string,
  ): Promise<CertifiedGemstoneRecord | undefined> {
    const row = await this.prisma.certified_gemstones.findUnique({
      where: { internal_code: internalCode },
    });
    return row ? toCertifiedGemstoneRecord(row) : undefined;
  }

  async createCertifiedGemstone(params: {
    internalCode: string;
    gemstoneOptionId: string;
    certificateProvider?: string;
    certificateNumber?: string;
    certificateUrl?: string;
    certificateMetadataJson?: Record<string, unknown>;
    purchaseCost?: number;
    locationCode?: string;
    performedByUserId?: string;
  }): Promise<CertifiedGemstoneRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const gemstone = await tx.certified_gemstones.create({
        data: {
          internal_code: params.internalCode,
          gemstone_option_id: params.gemstoneOptionId,
          certificate_provider: params.certificateProvider,
          certificate_number: params.certificateNumber,
          certificate_url: params.certificateUrl,
          certificate_metadata_json:
            (params.certificateMetadataJson as
              Prisma.InputJsonValue | undefined) ?? {},
          purchase_cost:
            params.purchaseCost !== undefined ? params.purchaseCost : null,
          location_code: params.locationCode,
          status: 'AVAILABLE',
          received_at: now,
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'RECEIVE',
          certified_gemstone_id: gemstone.id,
          quantity: 1,
          unit_cost_snapshot:
            params.purchaseCost !== undefined ? params.purchaseCost : null,
          reason: 'Initial certified gemstone receipt',
          performed_by_user_id: params.performedByUserId ?? null,
          occurred_at: now,
        },
      });

      return gemstone;
    });

    return toCertifiedGemstoneRecord(row);
  }

  async findInventoryMovements(filter: {
    stockLotId?: string;
    certifiedGemstoneId?: string;
    movementType?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: InventoryMovementRecord[]; total: number }> {
    const where: Prisma.inventory_movementsWhereInput = {
      ...(filter.stockLotId ? { stock_lot_id: filter.stockLotId } : {}),
      ...(filter.certifiedGemstoneId
        ? { certified_gemstone_id: filter.certifiedGemstoneId }
        : {}),
      ...(filter.movementType ? { movement_type: filter.movementType } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.inventory_movements.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { occurred_at: 'desc' },
      }),
      this.prisma.inventory_movements.count({ where }),
    ]);

    return { items: items.map((m) => toInventoryMovementRecord(m)), total };
  }

  async adjustInventory(params: {
    stockLotId: string;
    adjustedQuantity: number;
    reason: string;
    metadataJson?: Record<string, unknown>;
    performedByUserId?: string;
  }): Promise<StockLotRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockStockLots(tx, [params.stockLotId]);
      const lot = await tx.stock_lots.findUnique({
        where: { id: params.stockLotId },
      });
      if (!lot) {
        throw new Error('STOCK_LOT_NOT_FOUND');
      }

      const nextOnHand = lot.quantity_on_hand + params.adjustedQuantity;
      if (nextOnHand < 0 || nextOnHand < lot.quantity_reserved) {
        throw new Error('STOCK_INSUFFICIENT');
      }

      const now = new Date();
      const updatedLot = await tx.stock_lots.update({
        where: { id: params.stockLotId },
        data: {
          quantity_on_hand: nextOnHand,
          status: nextOnHand === 0 ? 'INACTIVE' : 'ACTIVE',
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'ADJUST',
          stock_lot_id: params.stockLotId,
          quantity: params.adjustedQuantity,
          unit_cost_snapshot: lot.unit_cost,
          reason: params.reason,
          metadata_json:
            (params.metadataJson as Prisma.InputJsonValue | undefined) ?? {},
          performed_by_user_id: params.performedByUserId ?? null,
          occurred_at: now,
        },
      });

      return updatedLot;
    });

    return toStockLotRecord(row);
  }

  async holdInventory(params: {
    ringItemId: string;
    stockLotId?: string;
    certifiedGemstoneId?: string;
    quantity: number;
    expiresAt: Date;
    allocatedByUserId: string;
  }): Promise<AllocationRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const [order] = await tx.$queryRaw<{ status: string }[]>`
        SELECT o.status FROM ordering.orders AS o
        JOIN ordering.ring_items AS item ON item.order_id = o.id
        WHERE item.id = ${params.ringItemId}::uuid
        FOR NO KEY UPDATE OF o
      `;
      if (!order) throw new NotFoundException('Ring item not found');
      if (order.status === 'CANCELLED' || order.status === 'EXPIRED_UNPAID') {
        throw new ConflictException(
          'Cannot hold inventory for an inactive order',
        );
      }

      if (params.stockLotId) {
        await lockStockLots(tx, [params.stockLotId]);
        const lot = await tx.stock_lots.findUnique({
          where: { id: params.stockLotId },
        });
        if (!lot) throw new Error('STOCK_LOT_NOT_FOUND');
        const available = lot.quantity_on_hand - lot.quantity_reserved;
        if (available < params.quantity) {
          throw new Error('STOCK_INSUFFICIENT');
        }

        await tx.stock_lots.update({
          where: { id: params.stockLotId },
          data: {
            quantity_reserved: lot.quantity_reserved + params.quantity,
            updated_at: new Date(),
          },
        });
      }

      if (params.certifiedGemstoneId) {
        if (params.stockLotId || params.quantity !== 1) {
          throw new Error('INVALID_CERTIFIED_ALLOCATION');
        }
        const [allocation] =
          (await setCertifiedGemstoneAssignments(
            tx,
            [
              {
                ringItemId: params.ringItemId,
                certifiedGemstoneId: params.certifiedGemstoneId.toLowerCase(),
              },
            ],
            'HOLD',
            { userId: params.allocatedByUserId, expiresAt: params.expiresAt },
          )) ?? [];
        if (!allocation) {
          const gem = await tx.certified_gemstones.findUnique({
            where: { id: params.certifiedGemstoneId },
          });
          throw new Error(
            gem ? 'GEMSTONE_NOT_AVAILABLE' : 'CERTIFIED_GEMSTONE_NOT_FOUND',
          );
        }
        return allocation;
      }

      return tx.allocations.create({
        data: {
          ring_item_id: params.ringItemId,
          stock_lot_id: params.stockLotId,
          certified_gemstone_id: params.certifiedGemstoneId,
          quantity: params.quantity,
          status: 'HOLD',
          expires_at: params.expiresAt,
          allocated_by_user_id: params.allocatedByUserId,
        },
      });
    });

    return toAllocationRecord(row);
  }

  async reserveInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockAllocationGemstone(tx, params.allocationId);
      await lockAllocationStockLot(tx, params.allocationId);
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.status !== 'HOLD') {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }
      if (allocation.certified_gemstone_id) {
        if (!allocation.expires_at || allocation.expires_at <= new Date())
          throw new Error('INVALID_ALLOCATION_STATUS');
        const [reserved] =
          (await setCertifiedGemstoneAssignments(
            tx,
            [
              {
                ringItemId: allocation.ring_item_id,
                certifiedGemstoneId: allocation.certified_gemstone_id,
              },
            ],
            'RESERVED',
          )) ?? [];
        if (!reserved || reserved.id !== allocation.id)
          throw new Error('INVALID_ALLOCATION_STATUS');
        return tx.allocations.update({
          where: { id: reserved.id },
          data: { allocated_by_user_id: params.allocatedByUserId },
        });
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: {
          status: 'RESERVED',
          expires_at: null,
          allocated_by_user_id: params.allocatedByUserId,
          updated_at: new Date(),
        },
      });
    });

    return toAllocationRecord(row);
  }

  async allocateInventory(params: {
    allocationId: string;
    productionAttemptId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockAllocationGemstone(tx, params.allocationId);
      await lockAllocationStockLot(tx, params.allocationId);
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.certified_gemstone_id) {
        if (allocation.status !== 'RESERVED')
          throw new Error('INVALID_ALLOCATION_STATUS');
        const gemstone = await tx.certified_gemstones.updateMany({
          where: { id: allocation.certified_gemstone_id, status: 'RESERVED' },
          data: { status: 'ALLOCATED', updated_at: new Date() },
        });
        if (!gemstone.count) throw new Error('INVALID_ALLOCATION_STATUS');
      } else if (
        allocation.status !== 'RESERVED' &&
        allocation.status !== 'HOLD'
      ) {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: {
          status: 'ALLOCATED',
          production_attempt_id: params.productionAttemptId,
          allocated_by_user_id: params.allocatedByUserId,
          updated_at: new Date(),
        },
      });
    });

    return toAllocationRecord(row);
  }

  async consumeInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockAllocationGemstone(tx, params.allocationId);
      await lockAllocationStockLot(tx, params.allocationId);
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
        include: { stock_lots: true, certified_gemstones: true },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.status !== 'ALLOCATED') {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }

      const now = new Date();
      if (allocation.stock_lot_id && allocation.stock_lots) {
        const lot = allocation.stock_lots;
        const nextOnHand = lot.quantity_on_hand - allocation.quantity;
        const nextReserved = lot.quantity_reserved - allocation.quantity;
        if (nextOnHand < 0 || nextReserved < 0) {
          throw new ConflictException(
            'Stock reservation balance is inconsistent',
          );
        }
        await tx.stock_lots.update({
          where: { id: allocation.stock_lot_id },
          data: {
            quantity_on_hand: nextOnHand,
            quantity_reserved: nextReserved,
            status: nextOnHand <= 0 ? 'INACTIVE' : 'ACTIVE',
            updated_at: now,
          },
        });

        await tx.inventory_movements.create({
          data: {
            movement_type: 'CONSUME',
            stock_lot_id: allocation.stock_lot_id,
            allocation_id: allocation.id,
            ring_item_id: allocation.ring_item_id,
            production_attempt_id: allocation.production_attempt_id,
            quantity: allocation.quantity,
            unit_cost_snapshot: lot.unit_cost,
            reason: 'Consumed for production',
            performed_by_user_id: params.allocatedByUserId || null,
            occurred_at: now,
          },
        });
      }

      if (allocation.certified_gemstone_id && allocation.certified_gemstones) {
        const gem = allocation.certified_gemstones;
        await tx.certified_gemstones.update({
          where: { id: allocation.certified_gemstone_id },
          data: { status: 'USED', updated_at: now },
        });

        await tx.inventory_movements.create({
          data: {
            movement_type: 'CONSUME',
            certified_gemstone_id: allocation.certified_gemstone_id,
            allocation_id: allocation.id,
            ring_item_id: allocation.ring_item_id,
            production_attempt_id: allocation.production_attempt_id,
            quantity: 1,
            unit_cost_snapshot: gem.purchase_cost ?? 0,
            reason: 'Mounted gemstone for production',
            performed_by_user_id: params.allocatedByUserId || null,
            occurred_at: now,
          },
        });
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: { status: 'CONSUMED', updated_at: now },
      });
    });

    return toAllocationRecord(row);
  }

  async releaseInventory(params: {
    allocationId: string;
    reason?: string;
    allocatedByUserId: string;
  }): Promise<AllocationRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await lockAllocationGemstone(tx, params.allocationId);
      await lockAllocationStockLot(tx, params.allocationId);
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
        include: { stock_lots: true, certified_gemstones: true },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (
        allocation.status === 'CONSUMED' ||
        allocation.status === 'RELEASED' ||
        allocation.status === 'EXPIRED'
      ) {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }

      const now = new Date();
      if (allocation.stock_lot_id) {
        return releaseStockLotAllocation(
          tx,
          { ...allocation, stock_lot_id: allocation.stock_lot_id },
          now,
          params.reason ?? 'Stock lot allocation released',
          params.allocatedByUserId,
        );
      }

      const released = await tx.allocations.update({
        where: { id: params.allocationId },
        data: { status: 'RELEASED', updated_at: now },
      });
      if (allocation.certified_gemstone_id) {
        await restoreCertifiedAvailability(tx, allocation, now);
        await recordCertifiedRelease(
          tx,
          allocation,
          params.reason ?? 'Certified gemstone released',
          now,
          params.allocatedByUserId,
        );
      }
      return released;
    });

    return toAllocationRecord(row);
  }
}
