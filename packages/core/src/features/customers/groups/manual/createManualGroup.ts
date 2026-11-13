import { customerGroups } from "@openmers/db"
import { auditStatement } from "../../../audit"
import { insertWithPublicId } from "../../../ids"
import { auditActorOf } from "../../account/auditActor"
import { type CustomerAdminCtx, CustomerError } from "../../types"

export type CreateManualGroupInput = {
  name: string
  description?: string | null
  /** Price list / promotion / tax / payment target: the group enters the customer session. */
  affectsCommerce: boolean
}

/** Manual customer group (11-musteriler §5); smart groups are a separate path. */
export async function createManualGroup(
  ctx: CustomerAdminCtx,
  input: CreateManualGroupInput,
): Promise<{ publicId: string }> {
  const name = input.name.trim()
  if (!name) throw new CustomerError("INVALID_INPUT", "group name is required")
  const p = ctx.platform
  const publicId = await insertWithPublicId(
    p,
    (id) => [
      p.db
        .insert(customerGroups)
        .values({
          publicId: id,
          name,
          description: input.description ?? null,
          kind: "manual",
          affectsCommerce: input.affectsCommerce,
          createdAt: ctx.now,
          updatedAt: ctx.now,
        })
        .toSQL(),
      auditStatement(
        p.db,
        {
          actor: auditActorOf(ctx.actor),
          action: "customers:write",
          entityType: "customer_group",
          entityPublicId: id,
          after: { name, affectsCommerce: input.affectsCommerce },
          requestId: ctx.requestId,
        },
        ctx.now,
      ),
    ],
    { prefix: "cgr_" },
  )
  return { publicId }
}
