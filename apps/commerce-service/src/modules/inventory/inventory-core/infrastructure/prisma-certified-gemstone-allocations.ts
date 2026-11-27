import { Prisma } from '../../../../../generated/prisma/client';
import type { allocations } from '../../../../../generated/prisma/client';

const CERTIFIED_HOLD_MS = 15 * 60 * 1000;
const CERTIFIED_RESERVATION_MS = 7 * 24 * 60 * 60 * 1000;

interface CertifiedGemstoneAssignment {
  readonly certifiedGemstoneId: string;
  readonly gemstoneOptionId?: string;
  readonly ringItemId: string;
}

export function availableCertifiedGemstones(
  now: Date,
): Prisma.certified_gemstonesWhereInput {
  return {
    OR: [
      { status: 'AVAILABLE' },
      {
        status: 'HOLD',
        allocations: { some: { status: 'HOLD', expires_at: { lte: now } } },
      },
    ],
    allocations: { none: activeCertifiedAllocations(now) },
  };
}

function activeCertifiedAllocations(now: Date): Prisma.allocationsWhereInput {
  return {
    OR: [
      { status: { in: ['RESERVED', 'ALLOCATED'] } },
      {
        status: 'HOLD',
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      },
    ],
  };
}

async function lockCertifiedGemstones(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  await tx.$queryRaw`
    SELECT id FROM inventory.certified_gemstones
    WHERE id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
    ORDER BY id FOR NO KEY UPDATE
  `;
}

export async function setCertifiedGemstoneAssignments(
  tx: Prisma.TransactionClient,
  assignments: readonly CertifiedGemstoneAssignment[],
  status: 'HOLD' | 'RESERVED',
  heldBy?: { userId: string; expiresAt: Date },
): Promise<allocations[] | undefined> {
  if (assignments.length === 0) return [];
  const ids = assignments.map(({ certifiedGemstoneId }) => certifiedGemstoneId);
  if (new Set(ids).size !== ids.length) return undefined;
  await lockCertifiedGemstones(tx, ids);

  const now = new Date();
  const expiresAt = new Date(
    Math.min(
      heldBy?.expiresAt.getTime() ?? Infinity,
      now.getTime() +
        (status === 'HOLD' ? CERTIFIED_HOLD_MS : CERTIFIED_RESERVATION_MS),
    ),
  );
  if (expiresAt <= now) return undefined;
  const gems = await tx.certified_gemstones.findMany({
    where: { id: { in: ids } },
    include: {
      allocations: {
        where: { status: { in: ['HOLD', 'RESERVED', 'ALLOCATED'] } },
      },
    },
  });
  const eligible: {
    assignment: CertifiedGemstoneAssignment;
    active?: allocations;
    expired: allocations[];
  }[] = [];
  for (const assignment of assignments) {
    const gem = gems.find(({ id }) => id === assignment.certifiedGemstoneId);
    if (
      !gem ||
      (assignment.gemstoneOptionId &&
        gem.gemstone_option_id !== assignment.gemstoneOptionId)
    )
      return undefined;

    const expired = gem.allocations.filter(
      (allocation) =>
        allocation.status === 'HOLD' &&
        allocation.expires_at &&
        allocation.expires_at <= now,
    );
    const active = gem.allocations.filter(
      (allocation) => !expired.includes(allocation),
    );
    const current = active[0];
    if (current) {
      if (
        active.length > 1 ||
        current.ring_item_id !== assignment.ringItemId ||
        current.status !== gem.status ||
        !['HOLD', 'RESERVED'].includes(current.status) ||
        !current.expires_at ||
        current.expires_at <= now ||
        (status === 'HOLD' && current.status === 'RESERVED')
      )
        return undefined;
    } else if (
      gem.status !== 'AVAILABLE' &&
      !(gem.status === 'HOLD' && expired.length > 0)
    ) {
      return undefined;
    }
    eligible.push({ assignment, active: current, expired });
  }

  const results: allocations[] = [];
  for (const { assignment, active, expired } of eligible) {
    for (const allocation of expired) {
      await tx.allocations.update({
        where: { id: allocation.id },
        data: { status: 'EXPIRED', updated_at: now },
      });
      await recordCertifiedRelease(
        tx,
        allocation,
        'Certified gemstone hold expired',
        now,
      );
    }
    if (active?.status === status) {
      results.push(active);
      continue;
    }
    const allocation = active
      ? await tx.allocations.update({
          where: { id: active.id },
          data: { status, expires_at: expiresAt, updated_at: now },
        })
      : await tx.allocations.create({
          data: {
            ring_item_id: assignment.ringItemId,
            certified_gemstone_id: assignment.certifiedGemstoneId,
            quantity: 1,
            status,
            expires_at: expiresAt,
            allocated_by_user_id: heldBy?.userId,
            updated_at: now,
          },
        });
    await tx.certified_gemstones.update({
      where: { id: assignment.certifiedGemstoneId },
      data: { status, updated_at: now },
    });
    if (status === 'RESERVED') {
      await tx.inventory_movements.create({
        data: {
          movement_type: 'RESERVE',
          certified_gemstone_id: assignment.certifiedGemstoneId,
          allocation_id: allocation.id,
          ring_item_id: assignment.ringItemId,
          quantity: 1,
          reason: active
            ? 'Confirmed certified gemstone hold'
            : 'Re-held exact certified gemstone and reserved atomically',
          occurred_at: now,
        },
      });
    }
    results.push(allocation);
  }
  return results;
}

export async function findCertifiedGemstoneAssignments(
  tx: Prisma.TransactionClient,
  versionIds: readonly string[],
): Promise<CertifiedGemstoneAssignment[] | undefined> {
  const selections = await tx.ring_item_version_gemstones.findMany({
    where: {
      ring_item_version_id: { in: [...versionIds] },
      OR: [
        { gemstone_options: { certified_required: true } },
        { certified_gemstone_id: { not: null } },
      ],
    },
    select: {
      certified_gemstone_id: true,
      gemstone_option_id: true,
      ring_item_versions: { select: { ring_item_id: true } },
    },
  });
  const assignments: CertifiedGemstoneAssignment[] = [];
  for (const selection of selections) {
    if (!selection.certified_gemstone_id) return undefined;
    assignments.push({
      certifiedGemstoneId: selection.certified_gemstone_id,
      gemstoneOptionId: selection.gemstone_option_id,
      ringItemId: selection.ring_item_versions.ring_item_id,
    });
  }
  return assignments;
}

export async function recordCertifiedRelease(
  tx: Prisma.TransactionClient,
  allocation: allocations,
  reason: string,
  now: Date,
  performedByUserId?: string,
): Promise<void> {
  await tx.inventory_movements.create({
    data: {
      movement_type: 'RELEASE',
      certified_gemstone_id: allocation.certified_gemstone_id,
      allocation_id: allocation.id,
      ring_item_id: allocation.ring_item_id,
      quantity: 1,
      reason,
      occurred_at: now,
      performed_by_user_id: performedByUserId,
    },
  });
}

export async function releaseCertifiedGemstoneAssignments(
  tx: Prisma.TransactionClient,
  ringItemIds: readonly string[],
  statuses: ('HOLD' | 'RESERVED')[],
  reason: string,
): Promise<void> {
  const where = {
    ring_item_id: { in: [...ringItemIds] },
    certified_gemstone_id: { not: null },
    status: { in: statuses },
  };
  const rows = await tx.allocations.findMany({
    where,
    select: { certified_gemstone_id: true },
  });
  await lockCertifiedGemstones(tx, [
    ...new Set(
      rows.flatMap(({ certified_gemstone_id }) =>
        certified_gemstone_id ? [certified_gemstone_id] : [],
      ),
    ),
  ]);
  const now = new Date();
  const active = await tx.allocations.findMany({ where });
  for (const allocation of active) {
    await tx.allocations.update({
      where: { id: allocation.id },
      data: { status: 'RELEASED', updated_at: now },
    });
    await restoreCertifiedAvailability(tx, allocation, now);
    await recordCertifiedRelease(tx, allocation, reason, now);
  }
}

export async function restoreCertifiedAvailability(
  tx: Prisma.TransactionClient,
  allocation: allocations,
  now: Date,
): Promise<void> {
  if (!allocation.certified_gemstone_id) return;
  await tx.certified_gemstones.updateMany({
    where: {
      id: allocation.certified_gemstone_id,
      status: allocation.status,
      allocations: { none: activeCertifiedAllocations(now) },
    },
    data: { status: 'AVAILABLE', updated_at: now },
  });
}

export async function lockAllocationGemstone(
  tx: Prisma.TransactionClient,
  allocationId: string,
): Promise<void> {
  const allocation = await tx.allocations.findUnique({
    where: { id: allocationId },
    select: { certified_gemstone_id: true },
  });
  if (allocation?.certified_gemstone_id)
    await lockCertifiedGemstones(tx, [allocation.certified_gemstone_id]);
}
