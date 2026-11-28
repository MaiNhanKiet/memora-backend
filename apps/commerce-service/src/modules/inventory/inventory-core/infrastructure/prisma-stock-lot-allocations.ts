import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../../../../generated/prisma/client';
import type { allocations } from '../../../../../generated/prisma/client';

export async function lockStockLots(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<void> {
  if (!ids.length) return;
  await tx.$queryRaw`
    SELECT id FROM inventory.stock_lots
    WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id FOR NO KEY UPDATE
  `;
}

export async function lockAllocationStockLot(
  tx: Prisma.TransactionClient,
  allocationId: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT lot.id FROM inventory.stock_lots AS lot
    JOIN inventory.allocations AS allocation ON allocation.stock_lot_id = lot.id
    WHERE allocation.id = ${allocationId}::uuid
    FOR NO KEY UPDATE OF lot
  `;
}

export async function releaseStockLotAllocation(
  tx: Prisma.TransactionClient,
  allocation: allocations & { stock_lot_id: string },
  now: Date,
  reason: string,
  actorId?: string,
): Promise<allocations> {
  const changed = await tx.stock_lots.updateMany({
    where: {
      id: allocation.stock_lot_id,
      quantity_reserved: { gte: allocation.quantity },
    },
    data: {
      quantity_reserved: { decrement: allocation.quantity },
      updated_at: now,
    },
  });
  if (!changed.count)
    throw new ConflictException('Stock reservation balance is inconsistent');

  const released = await tx.allocations.update({
    where: { id: allocation.id },
    data: { status: 'RELEASED', updated_at: now },
  });
  await tx.inventory_movements.create({
    data: {
      movement_type: 'RELEASE',
      stock_lot_id: allocation.stock_lot_id,
      allocation_id: allocation.id,
      ring_item_id: allocation.ring_item_id,
      production_attempt_id: allocation.production_attempt_id,
      quantity: allocation.quantity,
      reason,
      performed_by_user_id: actorId,
      occurred_at: now,
    },
  });
  return released;
}

export async function releaseOrderStockLotAllocations(
  tx: Prisma.TransactionClient,
  ringItemIds: readonly string[],
): Promise<void> {
  const where = {
    ring_item_id: { in: [...ringItemIds] },
    stock_lot_id: { not: null },
    status: { in: ['HOLD', 'RESERVED'] },
  };
  const candidates = await tx.allocations.findMany({
    where,
    select: { stock_lot_id: true },
  });
  const ids = new Set(
    candidates.flatMap(({ stock_lot_id }) =>
      stock_lot_id ? [stock_lot_id] : [],
    ),
  );
  if (!ids.size) return;
  await lockStockLots(tx, [...ids]);

  const now = new Date();
  const releasable = await tx.allocations.findMany({ where });
  for (const allocation of releasable) {
    if (allocation.stock_lot_id) {
      await releaseStockLotAllocation(
        tx,
        { ...allocation, stock_lot_id: allocation.stock_lot_id },
        now,
        'Order cancelled',
      );
    }
  }
}
