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
  /** Router yolu; ilk eleman `admin`. */
  path: readonly string[]
  procedure: { "~orpc": { meta: Record<PropertyKey, unknown> } }
}

/**
 * Admin yüzeyinin tek kapısı (kök ara katmandan, istek başına bir kez):
 * 1) kurulum kapısı (`setupGate`), 2) prosedürün erişim meta'sı (yoksa kapalı, 403),
 * 3) `om_a` oturumu → `loadAdminActor` (yönetici + kanal izinleri; yoksa 401),
 * 4) meta'daki izin aktörde yoksa 403.
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
  // Kayan oturum: süre uzadıysa yenilenen çerez yanıta taşınır.
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
