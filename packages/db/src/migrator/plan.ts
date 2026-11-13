// Saf: migration dosya adları + uygulanmış adlar → sırayla uygulanacaklar. G/Ç çağıranda
// (wrangler, Node çalıştırıcı, test yardımcısı); kayıt adı d1_migrations.name ile aynı (dosya adı).

export const MIGRATION_NAME = /^(\d{4})_[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/

export class MigrationPlanError extends Error {
  override name = "MigrationPlanError"
}

/** Dosya adlarını doğrular ve numara sırasına dizer: 0000'dan ardışık, boşluk ve tekrar yok. */
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

/** Bekleyen migration'lar. Uygulanmış ama dosyası olmayan ya da sıra dışı uygulanmış kayıt hatadır. */
export function planMigrations(files: readonly string[], applied: readonly string[]): string[] {
  const ordered = orderMigrations(files)
  const done = new Set(applied)
  const unknown = [...done].filter((name) => !ordered.includes(name))
  if (unknown.length > 0) {
    throw new MigrationPlanError(`dosyası olmayan uygulanmış migration: ${unknown.join(", ")}`)
  }
  // Uygulanmışlar baştan kesintisiz bir önek olmalı; aradaki eksik, sırayı bozar.
  const prefix = ordered.slice(0, done.size)
  const gap = prefix.find((name) => !done.has(name))
  if (gap) throw new MigrationPlanError(`sıra dışı: ${gap} uygulanmamış ama sonrakiler uygulanmış`)
  return ordered.slice(done.size)
}
