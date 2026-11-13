/** `audit_log` rows are immutable; `seq` is the rowid, `public_id` the external id. */
export type AuditActorType = "admin" | "app" | "apiKey" | "agent" | "system"

export type AuditActor = {
  type: AuditActorType
  /** `admin_users` / `app_installations` / `api_keys` / `agent_sessions`; none for `system`. */
  id?: number
  viaAppInstallationId?: number
  /** "Order on behalf of a customer": both the agent and the customer are recorded. */
  onBehalfCustomerId?: number
}

/** Audit row to be added to the command's `atomic()`. */
export type AuditEntry = {
  actor: AuditActor
  /** `<entity>:<action>`, e.g. `settings:write`. */
  action: string
  entityType?: string
  entityPublicId?: string
  channelId?: number
  before?: unknown
  after?: unknown
  requestId?: string
  /** If not given, a new id with the `aud_` prefix is generated. */
  publicId?: string
}
