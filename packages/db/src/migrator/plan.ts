// Pure: migration file names + applied names → the ones to apply in order. I/O stays with the caller
// (wrangler, Node runner, test helper); record name matches d1_migrations.name (file name).

export const MIGRATION_NAME = /^(\d{4})_[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/

export class MigrationPlanError extends Error {
  override name = "MigrationPlanError"
}

/** Validates file names and sorts by number: consecutive from 0000, no gaps or duplicates. */
export function orderMigrations(files: readonly string[]): string[] {
  const sorted = [...files].sort()
  sorted.forEach((file, i) => {
    const m = MIGRATION_NAME.exec(file)
    if (!m) throw new MigrationPlanError(`geçersiz migration adı: ${file}`)
    const n = Number(m[1])
    if (n < i) throw new MigrationPlanError(`tekrarlanan numara: ${file}`)
    if (n > i) throw new MigrationPlanError(`numara boşluğu: ${String(i).padStart(4, "0")} yok`)
  })
  return sorted
}

/** Pending migrations. An applied record with no file, or applied out of order, is an error. */
export function planMigrations(files: readonly string[], applied: readonly string[]): string[] {
  const ordered = orderMigrations(files)
  const done = new Set(applied)
  const unknown = [...done].filter((name) => !ordered.includes(name))
  if (unknown.length > 0) {
    throw new MigrationPlanError(`dosyası olmayan uygulanmış migration: ${unknown.join(", ")}`)
  }
  // Applied ones must be a contiguous prefix from the start; a gap in between breaks the order.
  const prefix = ordered.slice(0, done.size)
  const gap = prefix.find((name) => !done.has(name))
  if (gap) throw new MigrationPlanError(`sıra dışı: ${gap} uygulanmamış ama sonrakiler uygulanmış`)
  return ordered.slice(done.size)
}
