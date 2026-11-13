// Geliştirme: migration'ları yerel SQLite dosyasına uygular. Kullanım: pnpm db:migrate:local [dosya]
import { openMigratedDb } from "../src/testing/sqlite.ts"

const file = process.argv[2] ?? "local.sqlite"
openMigratedDb(file).close()
console.log(`migration'lar uygulandı: ${file}`)
