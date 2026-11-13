/** `audit_log` satırları değişmez; `seq` rowid, `public_id` dış kimlik. */
export type AuditActorType = "admin" | "app" | "apiKey" | "agent" | "system"

export type AuditActor = {
  type: AuditActorType
  /** `admin_users` / `app_installations` / `api_keys` / `agent_sessions`; `system`'de yok. */
  id?: number
  viaAppInstallationId?: number
  /** "Müşteri adına sipariş": hem temsilci hem müşteri kaydedilir. */
  onBehalfCustomerId?: number
}

/** Komutun `atomic()`'ine eklenecek denetim satırı. */
export type AuditEntry = {
  actor: AuditActor
  /** `<varlık>:<eylem>`, ör. `settings:write`. */
  action: string
  entityType?: string
  entityPublicId?: string
  channelId?: number
  before?: unknown
  after?: unknown
  requestId?: string
  /** Verilmezse `aud_` önekli yeni kimlik üretilir. */
  publicId?: string
}
