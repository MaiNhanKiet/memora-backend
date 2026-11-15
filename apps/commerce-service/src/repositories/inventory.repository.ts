import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../generated/prisma/client';
import type {
  allocations,
  certified_gemstones,
  inventory_movements,
  stock_lots,
} from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --- INVEN-001: List Ring Blank Stocks ---
  async findRingBlankStocks(filter: {
    templateVariantId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: stock_lots[]; total: number }> {
    const where: Prisma.stock_lotsWhereInput = {
      stock_type: 'RING_BLANK',
    };
    if (filter.templateVariantId) {
      where.template_variant_id = filter.templateVariantId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.stock_lots.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.stock_lots.count({ where }),
    ]);

    return { items, total };
  }

  // --- INVEN-002: Receive Ring Blank Stock ---
  async receiveRingBlankStock(params: {
    templateVariantId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<stock_lots> {
    const stockCode = `RB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
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
          status: 'AVAILABLE',
          received_at: params.receivedAt ?? now,
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'RECEIPT',
          stock_lot_id: stockLot.id,
          quantity: params.quantity,
          unit_cost_snapshot:
            params.unitCost !== undefined ? params.unitCost : null,
          reason: 'Initial ring blank receipt',
          performed_by_user_id: params.performedByUserId,
          occurred_at: now,
        },
      });

      return stockLot;
    });
  }

  // --- INVEN-003: List Gemstone Batches ---
  async findGemstoneBatches(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: stock_lots[]; total: number }> {
    const where: Prisma.stock_lotsWhereInput = {
      stock_type: 'GEMSTONE',
    };
    if (filter.gemstoneOptionId) {
      where.gemstone_option_id = filter.gemstoneOptionId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.stock_lots.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.stock_lots.count({ where }),
    ]);

    return { items, total };
  }

  // --- INVEN-004: Receive Gemstone Batch ---
  async receiveGemstoneBatch(params: {
    gemstoneOptionId: string;
    lotCode?: string;
    supplierRef?: string;
    quantity: number;
    unitCost?: number;
    locationCode?: string;
    receivedAt?: Date;
    performedByUserId?: string;
  }): Promise<stock_lots> {
    const stockCode = `GEM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    return this.prisma.$transaction(async (tx) => {
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
          status: 'AVAILABLE',
          received_at: params.receivedAt ?? now,
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'RECEIPT',
          stock_lot_id: stockLot.id,
          quantity: params.quantity,
          unit_cost_snapshot:
            params.unitCost !== undefined ? params.unitCost : null,
          reason: 'Initial gemstone batch receipt',
          performed_by_user_id: params.performedByUserId,
          occurred_at: now,
        },
      });

      return stockLot;
    });
  }

  // --- INVEN-005: List Certified Gemstones Availability ---
  async findCertifiedGemstoneAvailability(filter: {
    gemstoneOptionId?: string;
    status?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: certified_gemstones[]; total: number }> {
    const where: Prisma.certified_gemstonesWhereInput = {};
    if (filter.gemstoneOptionId) {
      where.gemstone_option_id = filter.gemstoneOptionId;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.certified_gemstones.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { updated_at: 'desc' },
      }),
      this.prisma.certified_gemstones.count({ where }),
    ]);

    return { items, total };
  }

  findCertifiedGemstoneByCode(
    internalCode: string,
  ): Promise<certified_gemstones | null> {
    return this.prisma.certified_gemstones.findUnique({
      where: { internal_code: internalCode },
    });
  }

  // --- INVEN-006: Create Certified Gemstone ---
  async createCertifiedGemstone(params: {
    internalCode: string;
    gemstoneOptionId: string;
    certificateProvider?: string;
    certificateNumber?: string;
    certificateUrl?: string;
    certificateMetadataJson?: Prisma.InputJsonValue;
    purchaseCost?: number;
    locationCode?: string;
    performedByUserId?: string;
  }): Promise<certified_gemstones> {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const gemstone = await tx.certified_gemstones.create({
        data: {
          internal_code: params.internalCode,
          gemstone_option_id: params.gemstoneOptionId,
          certificate_provider: params.certificateProvider,
          certificate_number: params.certificateNumber,
          certificate_url: params.certificateUrl,
          certificate_metadata_json: params.certificateMetadataJson ?? {},
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
          movement_type: 'RECEIPT',
          certified_gemstone_id: gemstone.id,
          quantity: 1,
          unit_cost_snapshot:
            params.purchaseCost !== undefined ? params.purchaseCost : null,
          reason: 'Initial certified gemstone intake',
          performed_by_user_id: params.performedByUserId,
          occurred_at: now,
        },
      });

      return gemstone;
    });
  }

  // --- INVEN-012: List Inventory Movements (Audit Ledger) ---
  async findInventoryMovements(filter: {
    stockLotId?: string;
    certifiedGemstoneId?: string;
    movementType?: string;
    limit: number;
    offset: number;
  }): Promise<{ items: inventory_movements[]; total: number }> {
    const where: Prisma.inventory_movementsWhereInput = {};
    if (filter.stockLotId) {
      where.stock_lot_id = filter.stockLotId;
    }
    if (filter.certifiedGemstoneId) {
      where.certified_gemstone_id = filter.certifiedGemstoneId;
    }
    if (filter.movementType) {
      where.movement_type = filter.movementType;
    }

    const [items, total] = await Promise.all([
      this.prisma.inventory_movements.findMany({
        where,
        take: filter.limit,
        skip: filter.offset,
        orderBy: { occurred_at: 'desc' },
      }),
      this.prisma.inventory_movements.count({ where }),
    ]);

    return { items, total };
  }

  // --- INVEN-013: Adjust Inventory ---
  async adjustInventory(params: {
    stockLotId: string;
    adjustedQuantity: number;
    reason: string;
    metadataJson?: Prisma.InputJsonValue;
    performedByUserId?: string;
  }): Promise<stock_lots> {
    return this.prisma.$transaction(async (tx) => {
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
          status: nextOnHand === 0 ? 'EXHAUSTED' : 'AVAILABLE',
          updated_at: now,
        },
      });

      await tx.inventory_movements.create({
        data: {
          movement_type: 'ADJUSTMENT',
          stock_lot_id: params.stockLotId,
          quantity: params.adjustedQuantity,
          unit_cost_snapshot: lot.unit_cost,
          reason: params.reason,
          metadata_json: params.metadataJson ?? {},
          performed_by_user_id: params.performedByUserId,
          occurred_at: now,
        },
      });

      return updatedLot;
    });
  }

  // --- Allocations & Stock Lifecycle (INVEN-007..011) ---

  async findAllocationById(id: string): Promise<allocations | null> {
    return this.prisma.allocations.findUnique({
      where: { id },
      include: {
        stock_lots: true,
        certified_gemstones: true,
      },
    });
  }

  async holdInventory(params: {
    ringItemId: string;
    stockLotId?: string;
    certifiedGemstoneId?: string;
    quantity: number;
    expiresAt: Date;
    allocatedByUserId: string;
  }): Promise<allocations> {
    return this.prisma.$transaction(async (tx) => {
      if (params.stockLotId) {
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
        const gem = await tx.certified_gemstones.findUnique({
          where: { id: params.certifiedGemstoneId },
        });
        if (!gem) throw new Error('CERTIFIED_GEMSTONE_NOT_FOUND');
        if (gem.status !== 'AVAILABLE') {
          throw new Error('GEMSTONE_NOT_AVAILABLE');
        }

        await tx.certified_gemstones.update({
          where: { id: params.certifiedGemstoneId },
          data: {
            status: 'RESERVED',
            updated_at: new Date(),
          },
        });
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
  }

  async reserveInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<allocations> {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.status !== 'HOLD') {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: {
          status: 'RESERVED',
          expires_at: null, // clear TTL on reserve
          allocated_by_user_id: params.allocatedByUserId,
          updated_at: new Date(),
        },
      });
    });
  }

  async allocateInventory(params: {
    allocationId: string;
    productionAttemptId: string;
    allocatedByUserId: string;
  }): Promise<allocations> {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.status !== 'RESERVED' && allocation.status !== 'HOLD') {
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
  }

  async consumeInventory(params: {
    allocationId: string;
    allocatedByUserId: string;
  }): Promise<allocations> {
    return this.prisma.$transaction(async (tx) => {
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
        await tx.stock_lots.update({
          where: { id: allocation.stock_lot_id },
          data: {
            quantity_on_hand: Math.max(0, nextOnHand),
            quantity_reserved: Math.max(0, nextReserved),
            status: nextOnHand <= 0 ? 'EXHAUSTED' : 'AVAILABLE',
            updated_at: now,
          },
        });

        await tx.inventory_movements.create({
          data: {
            movement_type: 'OUTBOUND',
            stock_lot_id: allocation.stock_lot_id,
            allocation_id: allocation.id,
            ring_item_id: allocation.ring_item_id,
            production_attempt_id: allocation.production_attempt_id,
            quantity: -allocation.quantity,
            unit_cost_snapshot: lot.unit_cost,
            reason: 'Consumed for production',
            performed_by_user_id: params.allocatedByUserId,
            occurred_at: now,
          },
        });
      }

      if (allocation.certified_gemstone_id && allocation.certified_gemstones) {
        const gem = allocation.certified_gemstones;
        await tx.certified_gemstones.update({
          where: { id: allocation.certified_gemstone_id },
          data: {
            status: 'MOUNTED',
            updated_at: now,
          },
        });

        await tx.inventory_movements.create({
          data: {
            movement_type: 'OUTBOUND',
            certified_gemstone_id: allocation.certified_gemstone_id,
            allocation_id: allocation.id,
            ring_item_id: allocation.ring_item_id,
            production_attempt_id: allocation.production_attempt_id,
            quantity: -1,
            unit_cost_snapshot: gem.purchase_cost ?? 0,
            reason: 'Mounted gemstone for production',
            performed_by_user_id: params.allocatedByUserId,
            occurred_at: now,
          },
        });
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: {
          status: 'CONSUMED',
          updated_at: now,
        },
      });
    });
  }

  async releaseInventory(params: {
    allocationId: string;
    reason?: string;
    allocatedByUserId: string;
  }): Promise<allocations> {
    return this.prisma.$transaction(async (tx) => {
      const allocation = await tx.allocations.findUnique({
        where: { id: params.allocationId },
        include: { stock_lots: true, certified_gemstones: true },
      });
      if (!allocation) throw new Error('ALLOCATION_NOT_FOUND');
      if (allocation.status === 'CONSUMED' || allocation.status === 'RELEASED') {
        throw new Error('INVALID_ALLOCATION_STATUS');
      }

      const now = new Date();
      if (allocation.stock_lot_id && allocation.stock_lots) {
        const lot = allocation.stock_lots;
        const nextReserved = Math.max(
          0,
          lot.quantity_reserved - allocation.quantity,
        );
        await tx.stock_lots.update({
          where: { id: allocation.stock_lot_id },
          data: {
            quantity_reserved: nextReserved,
            updated_at: now,
          },
        });
      }

      if (allocation.certified_gemstone_id) {
        await tx.certified_gemstones.update({
          where: { id: allocation.certified_gemstone_id },
          data: {
            status: 'AVAILABLE',
            updated_at: now,
          },
        });
      }

      return tx.allocations.update({
        where: { id: params.allocationId },
        data: {
          status: 'RELEASED',
          updated_at: now,
        },
      });
    });
  }
}
