import { customerGroupMembers, customerGroups } from "@openmers/db"
import { and, asc, eq } from "drizzle-orm"
import type { Platform } from "../../../platform"

/** Session size cap: at most 50 commerce groups per customer (11-musteriler §5.3). */
export const COMMERCE_GROUP_LIMIT = 50

/**
 * Group ids that go into the customer session: only `affects_commerce` groups (marketing groups do not grow
 * the session or the segment key), ascending, at most 50 (membership writes enforce the cap).
 */
export async function commerceGroupIds(
  p: Pick<Platform, "db">,
  customerId: number,
): Promise<number[]> {
  const rows = await p.db
    .select({ id: customerGroups.id })
    .from(customerGroupMembers)
    .innerJoin(customerGroups, eq(customerGroups.id, customerGroupMembers.groupId))
    .where(
      and(
        eq(customerGroupMembers.customerId, customerId),
        eq(customerGroups.affectsCommerce, true),
      ),
    )
    .orderBy(asc(customerGroups.id))
    .limit(COMMERCE_GROUP_LIMIT)
  return rows.map((r) => r.id)
}
