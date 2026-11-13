import type { CtxActor } from "../../../ctx"
import type { AuditActor } from "../../audit"

/** `audit_log` actor; a non-admin caller (job, test) is recorded as system. */
export function auditActorOf(actor: CtxActor): AuditActor {
  if (actor.type === "admin" || actor.type === "app" || actor.type === "apiKey") {
    return { type: actor.type, id: actor.id }
  }
  return { type: "system" }
}
