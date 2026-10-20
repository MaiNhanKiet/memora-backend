import type { Prisma } from '../../../generated/prisma/client';

const LAST_ACTIVE_ADMIN_LOCK_SQL =
  "SELECT pg_advisory_xact_lock(hashtext('memora.iam.last_active_admin')::bigint)";

/** Holds until the surrounding PostgreSQL transaction commits or rolls back. */
export async function lockLastActiveAdmin(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRawUnsafe(LAST_ACTIVE_ADMIN_LOCK_SQL);
}
