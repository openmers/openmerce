import { getAdminAccess } from "@openmers/contract"
import {
  type AdminActor,
  ANONYMOUS_ACTOR,
  type Ctx,
  type CtxActor,
  getSetupCompletedAt,
  loadAdminActor,
  setupGate,
} from "@openmers/core"
import { ORPCError } from "@orpc/server"
import { forwardSetCookies } from "../auth/cookies"
import type { ApiInitialContext } from "./base"

export type AdminGuardResult = { actor: CtxActor; admin?: AdminActor }

type GuardInput = {
  context: ApiInitialContext
  ctx: Ctx
  /** Router path; the first element is `admin`. */
  path: readonly string[]
  procedure: { "~orpc": { meta: Record<PropertyKey, unknown> } }
}

/**
 * The single gate of the Admin surface (from the root middleware, once per request):
 * 1) setup gate (`setupGate`), 2) the procedure's access meta (closed if missing, 403),
 * 3) `om_a` session → `loadAdminActor` (admin + channel permissions; 401 if missing),
 * 4) 403 if the actor lacks the permission in the meta.
 */
export async function requirePermission(input: GuardInput): Promise<AdminGuardResult> {
  const { context, ctx } = input
  const gate = setupGate({
    surface: "admin",
    procedure: input.path.slice(1).join("."),
    setupCompletedAt: await getSetupCompletedAt(context.platform),
  })
  if (!gate.allow) throw new ORPCError(gate.reason)

  const access = getAdminAccess(input.procedure)
  if (!access) throw new ORPCError("FORBIDDEN")
  if (access === "public") return { actor: { ...ANONYMOUS_ACTOR, permissions: new Set() } }

  const result = await context.adminAuth.api.getSession({
    headers: context.reqHeaders,
    returnHeaders: true,
  })
  // Sliding session: if the expiry was extended, the renewed cookie is carried onto the response.
  forwardSetCookies(result.headers, context.resHeaders, context.https)
  const session = result.response
  if (!session) throw new ORPCError("UNAUTHENTICATED")

  const admin = await loadAdminActor(context.platform, {
    adminUserId: Number(session.user.id),
    sessionVersion: Number(session.session.sessionVersion),
    channelId: ctx.channel.id,
  })
  if (!admin) throw new ORPCError("UNAUTHENTICATED")
  if (access !== "session" && !admin.permissions.has(access)) throw new ORPCError("FORBIDDEN")
  return { actor: { type: "admin", id: admin.id, permissions: admin.permissions }, admin }
}
