import { customerGroupMembers, customerGroups, customers, users } from "@openmers/db"
import { and, eq, type SQL, sql } from "drizzle-orm"
import { type AtomicStatement, affected, guardedInsertStatement } from "../../../../platform"
import { auditStatement } from "../../../audit"
import { auditActorOf } from "../../account/auditActor"
import { COMMERCE_GROUP_LIMIT } from "../../session/commerceGroupIds"
import { type CustomerAdminCtx, CustomerError } from "../../types"

export type GroupMemberInput = { groupPublicId: string; customerPublicId: string }

type Target = {
  groupId: number
  affectsCommerce: boolean
  customerId: number
  userId: number | null
}

async function loadTarget(ctx: CustomerAdminCtx, input: GroupMemberInput): Promise<Target> {
  const db = ctx.platform.db
  const [group] = await db
    .select({
      id: customerGroups.id,
      kind: customerGroups.kind,
      affects: customerGroups.affectsCommerce,
    })
    .from(customerGroups)
    .where(eq(customerGroups.publicId, input.groupPublicId))
    .limit(1)
  if (!group) throw new CustomerError("NOT_FOUND", "group not found")
  if (group.kind !== "manual")
    throw new CustomerError("INVALID_INPUT", "smart group members are rule based")
  const [customer] = await db
    .select({ id: customers.id, userId: customers.userId })
    .from(customers)
    .where(eq(customers.publicId, input.customerPublicId))
    .limit(1)
  if (!customer) throw new CustomerError("NOT_FOUND", "customer not found")
  return {
    groupId: group.id,
    affectsCommerce: group.affects,
    customerId: customer.id,
    userId: customer.userId,
  }
}

function memberExists(t: Target): SQL {
  return sql`EXISTS (SELECT 1 FROM ${customerGroupMembers}
    WHERE ${customerGroupMembers.groupId} = ${t.groupId} AND ${customerGroupMembers.customerId} = ${t.customerId})`
}

/** Commerce group cap (session size); marketing groups are not counted. */
function underCap(t: Target): SQL {
  if (!t.affectsCommerce) return sql`1 = 1`
  return sql`(SELECT count(*) FROM ${customerGroupMembers}
    JOIN ${customerGroups} ON ${customerGroups.id} = ${customerGroupMembers.groupId}
    WHERE ${customerGroupMembers.customerId} = ${t.customerId}
      AND ${customerGroups.affectsCommerce} = 1) < ${COMMERCE_GROUP_LIMIT}`
}

/**
 * Only a commerce group change bumps the session version, and only for this customer's account
 * (11-musteriler §5.3): the next request recomputes the session groups and segment.
 */
function sessionBump(ctx: CustomerAdminCtx, t: Target, guard: SQL): AtomicStatement[] {
  if (!t.affectsCommerce || t.userId === null) return []
  return [
    ctx.platform.db
      .update(users)
      .set({ sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date(ctx.now) })
      .where(and(eq(users.id, t.userId), guard))
      .toSQL(),
  ]
}

function audit(ctx: CustomerAdminCtx, input: GroupMemberInput, op: string, guard: SQL) {
  return auditStatement(
    ctx.platform.db,
    {
      actor: auditActorOf(ctx.actor),
      action: "customers:write",
      entityType: "customer_group",
      entityPublicId: input.groupPublicId,
      after: { op, customer: input.customerPublicId },
      requestId: ctx.requestId,
    },
    ctx.now,
    guard,
  )
}

/** Adds a customer to a manual group; `changed: false` if already a member. */
export async function addGroupMember(
  ctx: CustomerAdminCtx,
  input: GroupMemberInput,
): Promise<{ changed: boolean }> {
  const t = await loadTarget(ctx, input)
  // Conditions are evaluated before the insert, so the bump/audit rows follow the insert outcome.
  const guard = sql`NOT ${memberExists(t)} AND ${underCap(t)}`
  const stmts = [
    ...sessionBump(ctx, t, guard),
    audit(ctx, input, "add", guard),
    guardedInsertStatement(
      customerGroupMembers,
      { groupId: t.groupId, customerId: t.customerId, source: "manual", addedAt: ctx.now },
      guard,
    ),
  ]
  const result = await ctx.platform.atomic(stmts)
  if (affected(result, stmts.length - 1)) return { changed: true }
  const [row] = await ctx.platform.db
    .select({ one: sql<number>`1` })
    .from(customerGroupMembers)
    .where(
      and(
        eq(customerGroupMembers.groupId, t.groupId),
        eq(customerGroupMembers.customerId, t.customerId),
      ),
    )
    .limit(1)
  if (row) return { changed: false }
  throw new CustomerError(
    "LIMIT_EXCEEDED",
    `at most ${COMMERCE_GROUP_LIMIT} commerce groups per customer`,
  )
}

/** Removes a customer from a manual group; `changed: false` if not a member. */
export async function removeGroupMember(
  ctx: CustomerAdminCtx,
  input: GroupMemberInput,
): Promise<{ changed: boolean }> {
  const t = await loadTarget(ctx, input)
  const guard = memberExists(t)
  const stmts = [
    ...sessionBump(ctx, t, guard),
    audit(ctx, input, "remove", guard),
    ctx.platform.db
      .delete(customerGroupMembers)
      .where(
        and(
          eq(customerGroupMembers.groupId, t.groupId),
          eq(customerGroupMembers.customerId, t.customerId),
        ),
      )
      .toSQL(),
  ]
  const result = await ctx.platform.atomic(stmts)
  return { changed: affected(result, stmts.length - 1) }
}
