import { customers, sessions, users } from "@openmers/db"
import { and, eq } from "drizzle-orm"
import type { Platform } from "../../../platform"
import { commerceGroupIds } from "../../customers/session/commerceGroupIds"

export type CustomerActor = {
  id: number
  publicId: string
  groupIds: number[]
  priceListIds: number[]
}

/**
 * Loads the session's customer for the Shop surface (mirror of `loadAdminActor`). `null` (session rejected)
 * if the session row, the bound customer or the account is missing, or the customer is not `active`.
 * When `users.session_version` moved (e.g. a commerce group change) the session's group set is recomputed and
 * written back, so the next request carries the new segment without forcing a new sign-in.
 */
// shortcut: one read per request; drops to the session cache with item 12.5.
export async function loadCustomerActor(
  p: Pick<Platform, "db">,
  input: { sessionId: number; userId: number },
): Promise<CustomerActor | null> {
  const [row] = await p.db
    .select({
      customerId: sessions.customerId,
      groupIds: sessions.groupIds,
      priceListIds: sessions.priceListIds,
      sessionVersion: sessions.sessionVersion,
      userVersion: users.sessionVersion,
      publicId: customers.publicId,
      state: customers.state,
      boundUser: customers.userId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(customers, eq(customers.id, sessions.customerId))
    .where(and(eq(sessions.id, input.sessionId), eq(sessions.userId, input.userId)))
    .limit(1)
  if (row?.state !== "active" || row.boundUser !== input.userId) return null

  let groupIds = row.groupIds
  if (row.sessionVersion !== row.userVersion) {
    groupIds = await commerceGroupIds(p, row.customerId)
    await p.db
      .update(sessions)
      .set({ groupIds, sessionVersion: row.userVersion })
      .where(eq(sessions.id, input.sessionId))
  }
  return { id: row.customerId, publicId: row.publicId, groupIds, priceListIds: row.priceListIds }
}
