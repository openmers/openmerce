import { sql } from "drizzle-orm"
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"
import { createdAt, publicId, updatedAt } from "./columns"

// 01-cekirdek-isletme.md E (outbox, zamanlanmış görevler) ve G (`external_refs`, karar 3).
// Hedefi sonra açılan referanslar FK'sız (outbox.app_installation_id → 0028, scheduled_runs.outbox_id
// satırı silinir).

export const outboxKinds = [
  "event",
  "notify",
  "webhook",
  "reindex",
  "collection",
  "import",
  "invoice",
  "fulfillment",
  "scheduled",
] as const
export const outboxStatuses = ["pending", "sending", "sent", "failed", "dead"] as const

// version yok: sahiplenme status koşullu yazımdır
export const outbox = sqliteTable(
  "outbox",
  {
    id: integer("id").primaryKey(),
    publicId: publicId(),
    kind: text("kind", { enum: outboxKinds }).notNull(),
    event: text("event"),
    payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    appInstallationId: integer("app_installation_id"),
    status: text("status", { enum: outboxStatuses }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    // küçük önce
    priority: integer("priority").notNull(),
    nextAttemptAt: integer("next_attempt_at").notNull(),
    claimedAt: integer("claimed_at"),
    dedupeKey: text("dedupe_key"),
    lastError: text("last_error"),
    requestId: text("request_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("outbox_public_id_uq").on(t.publicId),
    index("outbox_claim_idx").on(t.status, t.priority, t.nextAttemptAt),
    uniqueIndex("outbox_dedupe_uq")
      .on(t.kind, t.dedupeKey)
      .where(sql`${t.status} = 'pending' AND ${t.dedupeKey} IS NOT NULL`),
    index("outbox_status_created_idx").on(t.status, t.createdAt),
    index("outbox_app_created_idx").on(t.appInstallationId, t.createdAt),
    check(
      "outbox_kind_ck",
      sql`${t.kind} IN ('event', 'notify', 'webhook', 'reindex', 'collection', 'import', 'invoice', 'fulfillment', 'scheduled')`,
    ),
    check("outbox_status_ck", sql`${t.status} IN ('pending', 'sending', 'sent', 'failed', 'dead')`),
    check("outbox_payload_ck", sql`json_type(${t.payload}) = 'object'`),
  ],
)

export const scheduledRuns = sqliteTable(
  "scheduled_runs",
  {
    id: integer("id").primaryKey(),
    // kodda tanımlı görev adı; built-in app görevleri `<app-id>.` önekli
    task: text("task").notNull(),
    // dönemin cron'a göre başlangıcı, epoch ms
    period: integer("period").notNull(),
    status: text("status", { enum: ["running", "done", "failed"] }).notNull(),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    error: text("error"),
    outboxId: integer("outbox_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // çalıştırma INSERT ... ON CONFLICT DO NOTHING'e koşullu; "son çalışmalar" sorgusunu da karşılar
    uniqueIndex("scheduled_runs_task_period_uq").on(t.task, t.period),
    check("scheduled_runs_status_ck", sql`${t.status} IN ('running', 'done', 'failed')`),
  ],
)

export const externalRefs = sqliteTable(
  "external_refs",
  {
    id: integer("id").primaryKey(),
    // taşımada `shopify` vb., uygulamada app_installations.app_key
    source: text("source").notNull(),
    // NULL benzersizliği bozduğu için boş dize
    connectionId: text("connection_id").notNull().default(""),
    entityType: text("entity_type").notNull(),
    localPublicId: text("local_public_id").notNull(),
    externalId: text("external_id").notNull(),
    externalCode: text("external_code"),
    digest: text("digest"),
    state: text("state"),
    lastMatchedAt: integer("last_matched_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("external_refs_external_uq").on(
      t.source,
      t.connectionId,
      t.entityType,
      t.externalId,
    ),
    index("external_refs_local_idx").on(t.entityType, t.localPublicId),
  ],
)
